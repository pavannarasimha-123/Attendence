const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Load environment from backend/.env or root .env
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Debug Middleware: Log all requests
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Error handling for the process
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n[UNHANDLED REJECTION]');
  console.error('At Promise:', promise);
  console.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('\n[UNCAUGHT EXCEPTION]');
  console.error(error);
  process.exit(1);
});

// --- COLUMN NAME NORMALIZERS ---
const ROLL_KEYS = ['Roll NO', 'Roll No', 'Roll No.', 'Roll number', 'Rollnumber', 'rollNo', 'RollNumber', 'Roll', 'roll'];
const NAME_KEYS = ['Name', 'name', 'Student Name', 'Full Name'];
const BRANCH_KEYS = ['Branch', 'branch', 'Dept', 'Department'];
const SEM_KEYS = ['Semester', 'semester', 'Sem', 'sem'];
const SEC_KEYS = ['Section', 'section', 'Sec', 'sec'];
const STATUS_KEYS = ['isPresent', 'ispresent', 'IsPresent', 'Status', 'status'];

function getField(row, keys) {
  if (!row) return '';
  for (const k of keys) {
    if (typeof row.get === 'function') {
      const v = row.get(k);
      if (v !== undefined && v !== null && v !== '') return v;
    } else if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
      return row[k];
    }
  }
  return '';
}

function findHeaderKey(headerValues, candidates) {
  if (!Array.isArray(headerValues)) return candidates[0];
  for (const cand of candidates) {
    const found = headerValues.find(h => h.toString().trim().toLowerCase() === cand.toLowerCase());
    if (found) return found;
  }
  return candidates[0];
}

// --- STORAGE MODE CONFIGURATION ---
const hasGoogleCreds = Boolean(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
  process.env.GOOGLE_PRIVATE_KEY &&
  process.env.SPREADSHEET_ID &&
  process.env.SPREADSHEET_ID.trim() !== '' &&
  process.env.SPREADSHEET_ID.trim() !== 'your_google_sheet_id_here' &&
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim() !== '' &&
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim() !== 'your_service_account_email_here'
);

const isExplicitLocal = process.env.USE_LOCAL_STORAGE === 'true';
const isLocalStorageMode = isExplicitLocal || !hasGoogleCreds;

const DATA_DIR = path.join(__dirname, 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'students.json');
const DEFAULT_STUDENTS_PATH = path.join(DATA_DIR, 'defaultStudents.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initLocalDb() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    if (fs.existsSync(DEFAULT_STUDENTS_PATH)) {
      fs.copyFileSync(DEFAULT_STUDENTS_PATH, LOCAL_DB_PATH);
    } else {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
    console.log('[LOCAL DB] Initialized students.json from template.');
  }
}

function getLocalStudents() {
  initLocalDb();
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[LOCAL DB ERROR] Failed reading students.json:', err.message);
    return [];
  }
}

function saveLocalStudents(students) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(students, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[LOCAL DB ERROR] Failed writing students.json:', err.message);
    return false;
  }
}

let doc = null;
let serviceAccountAuth = null;

if (!isLocalStorageMode) {
  console.log('[STORAGE] Google Sheets credentials detected. Initializing Google Sheets API connection...');

  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
  }

  const proxyUrl = process.env.HTTPS_PROXY;
  if (proxyUrl) {
    console.log(`[PROXY] Detected HTTPS_PROXY: ${proxyUrl}`);
  }

  serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    ...(proxyUrl ? { options: { agent: new HttpsProxyAgent(proxyUrl) } } : {})
  });

  doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);
} else {
  console.log('[STORAGE] Operating in Local Database mode (backend/data/students.json).');
  initLocalDb();
}

/**
 * Ensures Google Sheet is loaded
 */
async function ensureDocLoaded() {
  if (isLocalStorageMode) return;
  try {
    try {
      if (doc.sheetCount > 0) return;
    } catch (e) {}

    console.log('[SHEET] Initializing connection...');
    await doc.loadInfo();

    if (doc.sheetCount === 0) {
      throw new Error('The spreadsheet contains no worksheets.');
    }

    console.log(`[SHEET] Successfully loaded: "${doc.title}" (${doc.sheetCount} sheets)`);
  } catch (error) {
    console.error('[SHEET ERROR]', error.message);
    let advice = 'Check your internet connection.';
    if (error.code === 'ETIMEDOUT') {
      advice = 'Connection timed out. If you are behind a proxy, ensure HTTPS_PROXY is set in .env.';
    } else if (error.message.includes('403')) {
      advice = 'Ensure the service account has permission to view the sheet.';
    }
    throw new Error(`Failed to connect to Google Sheets. ${advice} (${error.code || 'UNKNOWN_ERROR'})`);
  }
}

// --- CONCURRENCY CONTROL ---
let isOperating = false;
const queue = [];
let cachedRows = null;
let studentMap = new Map();
let lastCacheUpdate = 0;
const CACHE_TTL = 30000;
const SCAN_CACHE_TTL = 5000;

async function withLock(fn, timeoutMs = 15000) {
  if (queue.length > 10) {
    const err = new Error('Too many requests. System is currently overwhelmed.');
    err.status = 429;
    throw err;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      const index = queue.findIndex(item => item.resolve === resolve);
      if (index !== -1) {
        queue.splice(index, 1);
        reject(new Error('Operation timed out (Lock Timeout)'));
      }
    }, timeoutMs);

    queue.push(async () => {
      try {
        const res = await fn();
        clearTimeout(timeout);
        resolve(res);
      } catch (e) {
        clearTimeout(timeout);
        reject(e);
      }
    });
    processQueue();
  });
}

async function processQueue() {
  if (isOperating || queue.length === 0) return;
  isOperating = true;
  const task = queue.shift();
  try {
    let attempts = 0;
    const maxAttempts = 3;

    const executeWithRetry = async () => {
      try {
        await task();
      } catch (e) {
        const isRateLimit = e.message.includes('429') || e.code === 429;
        const isTransient = isRateLimit || e.message.includes('ETIMEDOUT') || e.code === 'ECONNRESET';

        if (isTransient && attempts < maxAttempts) {
          attempts++;
          const delay = Math.pow(2, attempts) * 500;
          console.log(`[RETRY] Transient error detected. Retrying in ${delay}ms... (Attempt ${attempts}/${maxAttempts})`);
          await new Promise(r => setTimeout(r, delay));
          return executeWithRetry();
        }
        throw e;
      }
    };

    await executeWithRetry();
  } catch (e) {
    console.error('[QUEUE ERROR]', e.message);
  } finally {
    isOperating = false;
    setTimeout(processQueue, 30);
  }
}

/**
 * Gets rows/students, using cache if fresh enough.
 */
async function getCachedRows(forceRefresh = false, customTtl = CACHE_TTL) {
  const now = Date.now();
  if (!forceRefresh && cachedRows && (now - lastCacheUpdate < customTtl)) {
    return { rows: cachedRows, map: studentMap };
  }

  if (isLocalStorageMode) {
    const students = getLocalStudents();
    const newMap = new Map();
    students.forEach(student => {
      const roll = getField(student, ROLL_KEYS);
      if (roll) {
        newMap.set(roll.toString().trim().toLowerCase(), student);
      }
    });

    cachedRows = students;
    studentMap = newMap;
    lastCacheUpdate = Date.now();
    return { rows: cachedRows, map: studentMap };
  }

  await ensureDocLoaded();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  const newMap = new Map();
  rows.forEach(row => {
    const roll = getField(row, ROLL_KEYS);
    if (roll) {
      newMap.set(roll.toString().trim().toLowerCase(), row);
    }
  });

  cachedRows = rows;
  studentMap = newMap;
  lastCacheUpdate = Date.now();
  return { rows: cachedRows, map: studentMap };
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Attendance Backend is Running' });
});

// System Status Endpoint
app.get('/api/status', async (req, res) => {
  try {
    const { rows } = await getCachedRows();
    const total = rows ? rows.length : 0;
    res.json({
      status: 'online',
      mode: isLocalStorageMode ? 'local_storage' : 'google_sheets',
      sheetTitle: isLocalStorageMode ? 'Local JSON DB' : (doc?.title || 'Google Sheet'),
      totalStudents: total,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// API to Mark Attendance
app.post('/api/mark-attendance', async (req, res) => {
  const { rollNo } = req.body;

  if (!rollNo) {
    return res.status(400).json({ error: 'Roll Number is required' });
  }

  return withLock(async () => {
    const currentQueueDepth = queue.length;
    const cleanRoll = rollNo.toString().trim().toLowerCase();
    console.log(`\n[API] Processing Scan for: "${rollNo}" (Queue: ${currentQueueDepth})`);

    try {
      if (isLocalStorageMode) {
        const students = getLocalStudents();
        const studentIndex = students.findIndex(s =>
          getField(s, ROLL_KEYS).toString().trim().toLowerCase() === cleanRoll
        );

        if (studentIndex === -1) {
          console.warn(`[API] Roll Number not found: ${rollNo}`);
          return res.status(409).json({
            error: `Student registration not found. Roll Number "${rollNo}" is not in the system.`,
            queueDepth: currentQueueDepth,
            rollNo: rollNo,
            suggestion: "Please check the Roll Number or register the student via Spot Registration."
          });
        }

        const student = students[studentIndex];
        const currentStatus = getField(student, STATUS_KEYS);
        const isAlreadyPresent = (
          currentStatus === true ||
          currentStatus === 'TRUE' ||
          currentStatus === 'Present' ||
          String(currentStatus).toLowerCase() === 'true' ||
          String(currentStatus).toLowerCase() === 'yes'
        );

        if (isAlreadyPresent) {
          console.log(`[API] Student ${rollNo} already marked.`);
          return res.status(200).json({
            message: 'Already marked present',
            queueDepth: currentQueueDepth,
            student: {
              name: getField(student, NAME_KEYS),
              rollNo: getField(student, ROLL_KEYS),
              branch: getField(student, BRANCH_KEYS),
              semester: getField(student, SEM_KEYS),
              section: getField(student, SEC_KEYS)
            }
          });
        }

        console.log(`[API] Saving status for ${rollNo} in local DB...`);
        students[studentIndex].isPresent = true;
        saveLocalStudents(students);
        lastCacheUpdate = 0;

        return res.status(200).json({
          message: 'Marked Present',
          queueDepth: currentQueueDepth,
          student: {
            name: getField(student, NAME_KEYS),
            rollNo: getField(student, ROLL_KEYS),
            branch: getField(student, BRANCH_KEYS),
            semester: getField(student, SEM_KEYS),
            section: getField(student, SEC_KEYS)
          }
        });
      }

      // --- Google Sheets Mode ---
      const { map } = await getCachedRows(lastCacheUpdate === 0, SCAN_CACHE_TTL);
      const studentRow = map.get(cleanRoll);

      if (!studentRow) {
        console.warn(`[API] Roll Number not found: ${rollNo}`);
        return res.status(409).json({
          error: `Student registration not found. Roll Number "${rollNo}" is not in the system.`,
          queueDepth: currentQueueDepth,
          rollNo: rollNo,
          suggestion: "Please check the Roll Number or register the student via Spot Registration."
        });
      }

      const currentStatus = getField(studentRow, STATUS_KEYS);
      const isAlreadyPresent = (
        currentStatus === 'TRUE' ||
        currentStatus === 'Present' ||
        currentStatus === true ||
        String(currentStatus).toLowerCase() === 'true' ||
        String(currentStatus).toLowerCase() === 'yes'
      );

      if (isAlreadyPresent) {
        console.log(`[API] Student ${rollNo} already marked.`);
        return res.status(200).json({
          message: 'Already marked present',
          queueDepth: currentQueueDepth,
          student: {
            name: getField(studentRow, NAME_KEYS),
            rollNo: getField(studentRow, ROLL_KEYS),
            branch: getField(studentRow, BRANCH_KEYS),
            semester: getField(studentRow, SEM_KEYS),
            section: getField(studentRow, SEC_KEYS)
          }
        });
      }

      console.log(`[API] Saving status for ${rollNo} to Google Sheets...`);
      await doc.sheetsByIndex[0].loadHeaderRow();
      const statusKey = findHeaderKey(doc.sheetsByIndex[0].headerValues, STATUS_KEYS);
      studentRow.set(statusKey, 'TRUE');
      await studentRow.save();

      lastCacheUpdate = 0; // Invalidate cache

      return res.status(200).json({
        message: 'Marked Present',
        queueDepth: currentQueueDepth,
        student: {
          name: getField(studentRow, NAME_KEYS),
          rollNo: getField(studentRow, ROLL_KEYS),
          branch: getField(studentRow, BRANCH_KEYS),
          semester: getField(studentRow, SEM_KEYS),
          section: getField(studentRow, SEC_KEYS)
        }
      });

    } catch (error) {
      console.error('[API ERROR]', error.message);
      return res.status(error.status || 500).json({
        error: error.message,
        queueDepth: queue.length
      });
    }
  });
});

// API to Get All Attendance Data
app.get('/api/attendance', async (req, res) => {
  try {
    const { rows } = await getCachedRows();

    const students = Array.isArray(rows) ? rows.map(row => {
      const isPresentVal = getField(row, STATUS_KEYS);
      const isPresent = (
        isPresentVal === true ||
        isPresentVal === 'TRUE' ||
        isPresentVal === 'Present' ||
        String(isPresentVal).toLowerCase() === 'true'
      );

      return {
        name: getField(row, NAME_KEYS) || 'Unknown',
        rollNo: getField(row, ROLL_KEYS) || 'N/A',
        branch: getField(row, BRANCH_KEYS) || 'N/A',
        year: getField(row, ['Year of Study', 'Year', 'year']),
        semester: getField(row, SEM_KEYS) || '',
        section: getField(row, SEC_KEYS) || '',
        isPresent
      };
    }) : [];

    res.json(students);
  } catch (error) {
    console.error('[API ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API to Spot Register / Add Student
app.post('/api/register-student', async (req, res) => {
  const { rollNo, name, branch, semester, section, isPresent } = req.body;

  if (!rollNo || !name) {
    return res.status(400).json({ error: 'Roll Number and Name are required for registration.' });
  }

  const cleanRoll = rollNo.toString().trim();
  const cleanName = name.toString().trim();
  const cleanBranch = (branch || 'CSE').toString().trim().toUpperCase();
  const cleanSemester = (semester || 'Semester 6').toString().trim();
  const cleanSection = (section || 'A').toString().trim().toUpperCase();
  const markPresent = Boolean(isPresent === true || isPresent === 'true' || isPresent === 'TRUE');

  return withLock(async () => {
    try {
      console.log(`\n[API] Spot Registering Student: ${cleanRoll} - ${cleanName}`);

      if (isLocalStorageMode) {
        const students = getLocalStudents();
        const existing = students.find(s =>
          getField(s, ROLL_KEYS).toString().trim().toLowerCase() === cleanRoll.toLowerCase()
        );

        if (existing) {
          return res.status(409).json({
            error: `Student with Roll Number "${cleanRoll}" already exists (${getField(existing, NAME_KEYS)}).`
          });
        }

        const newStudent = {
          rollNo: cleanRoll,
          name: cleanName,
          branch: cleanBranch,
          semester: cleanSemester,
          section: cleanSection,
          isPresent: markPresent
        };

        students.push(newStudent);
        saveLocalStudents(students);
        lastCacheUpdate = 0;

        return res.status(201).json({
          message: markPresent
            ? `Student ${cleanName} registered and marked Present successfully!`
            : `Student ${cleanName} registered successfully!`,
          student: newStudent
        });
      }

      // --- Google Sheets Mode ---
      await ensureDocLoaded();
      const sheet = doc.sheetsByIndex[0];
      const { map } = await getCachedRows(true);

      if (map.has(cleanRoll.toLowerCase())) {
        return res.status(409).json({
          error: `Student with Roll Number "${cleanRoll}" already exists in Google Sheet.`
        });
      }

      await sheet.loadHeaderRow();
      const headers = sheet.headerValues;

      const rollKey = findHeaderKey(headers, ROLL_KEYS);
      const nameKey = findHeaderKey(headers, NAME_KEYS);
      const branchKey = findHeaderKey(headers, BRANCH_KEYS);
      const semKey = findHeaderKey(headers, SEM_KEYS);
      const secKey = findHeaderKey(headers, SEC_KEYS);
      const statusKey = findHeaderKey(headers, STATUS_KEYS);

      await sheet.addRow({
        [nameKey]: cleanName,
        [rollKey]: cleanRoll,
        [branchKey]: cleanBranch,
        [semKey]: cleanSemester,
        [secKey]: cleanSection,
        [statusKey]: markPresent ? 'TRUE' : ''
      });

      lastCacheUpdate = 0; // Invalidate cache

      return res.status(201).json({
        message: markPresent
          ? `Student ${cleanName} registered and marked Present successfully!`
          : `Student ${cleanName} registered successfully!`,
        student: {
          rollNo: cleanRoll,
          name: cleanName,
          branch: cleanBranch,
          semester: cleanSemester,
          section: cleanSection,
          isPresent: markPresent
        }
      });
    } catch (err) {
      console.error('[SPOT REGISTRATION ERROR]', err.message);
      return res.status(500).json({ error: 'Failed to register student: ' + err.message });
    }
  });
});

// API to Verify Portal Password (Admin / HOD)
app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.SPOT_REGISTRATION_PASSWORD || 'admin123';
  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  return res.status(200).json({ message: 'Password verified' });
});

// API to Verify Coordinator Password
app.post('/api/verify-coordinator', (req, res) => {
  const { password } = req.body;
  const expectedPassword = process.env.COORDINATOR_PASSWORD || process.env.SPOT_REGISTRATION_PASSWORD || 'coord123';

  if (!password || password !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid coordinator password' });
  }
  return res.status(200).json({ message: 'Coordinator access granted' });
});

// API to Clear All Attendance (Reset for next event)
app.post('/api/clear-attendance', async (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.SPOT_REGISTRATION_PASSWORD || 'admin123';

  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized: Invalid portal password' });
  }

  console.log('\n[ADMIN] Request received to CLEAR ALL attendance markings.');

  return withLock(async () => {
    try {
      if (isLocalStorageMode) {
        const students = getLocalStudents();
        let clearedCount = 0;
        students.forEach(s => {
          if (s.isPresent) {
            s.isPresent = false;
            clearedCount++;
          }
        });
        saveLocalStudents(students);

        lastCacheUpdate = 0;
        cachedRows = null;
        studentMap = new Map();

        return res.status(200).json({
          message: `Successfully reset attendance for ${clearedCount} students.`,
          clearedCount
        });
      }

      // --- Google Sheets Mode ---
      await ensureDocLoaded();
      const sheet = doc.sheetsByIndex[0];
      await sheet.loadHeaderRow();
      const headers = sheet.headerValues;
      const statusHeader = findHeaderKey(headers, STATUS_KEYS);
      const isPresentColIndex = headers.indexOf(statusHeader);

      if (isPresentColIndex === -1) {
        throw new Error(`Column "${statusHeader}" not found in the sheet.`);
      }

      const rows = await sheet.getRows();
      if (rows.length === 0) {
        return res.status(200).json({ message: 'No students found to clear.', clearedCount: 0 });
      }

      console.log(`[ADMIN] Bulk clearing attendance for ${rows.length} rows in Google Sheet...`);

      await sheet.loadCells({
        startRowIndex: 1,
        endRowIndex: rows.length + 1,
        startColumnIndex: isPresentColIndex,
        endColumnIndex: isPresentColIndex + 1
      });

      let clearedCount = 0;
      for (let i = 0; i < rows.length; i++) {
        const cell = sheet.getCell(i + 1, isPresentColIndex);
        const currentValue = cell.value;

        const isPresent = (
          currentValue === 'TRUE' ||
          currentValue === 'Present' ||
          currentValue === true ||
          (typeof currentValue === 'string' && currentValue.toLowerCase() === 'true')
        );

        if (isPresent) {
          cell.value = '';
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        await sheet.saveUpdatedCells();
      }

      console.log(`[ADMIN] Successfully cleared ${clearedCount} attendance records.`);

      lastCacheUpdate = 0;
      cachedRows = null;
      studentMap = new Map();

      return res.status(200).json({
        message: `Successfully reset attendance for ${clearedCount} students.`,
        clearedCount
      });

    } catch (error) {
      console.error('[ADMIN ERROR] Failed to clear attendance:', error.message);
      return res.status(500).json({ error: 'Failed to reset attendance: ' + error.message });
    }
  }, 60000);
});

// -------------------------------------------------------------
// FRONTEND STATIC ASSETS (UNIFIED FULL-STACK DEPLOYMENT)
// -------------------------------------------------------------
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  console.log(`[STATIC] Unified mode: Serving frontend from ${distPath}`);
  app.use(express.static(distPath));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Attendance Backend API is Running (Run npm run build to enable full-stack UI)');
  });
}

const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` Smart Attendance Server running on port ${PORT}`);
  console.log(` Mode: ${isLocalStorageMode ? 'LOCAL JSON STORAGE' : 'GOOGLE SHEETS SYNC'}`);
  console.log(` Admin Password: ${process.env.SPOT_REGISTRATION_PASSWORD ? '[Configured]' : 'admin123 (Default)'}`);
  console.log(` Coordinator Password: ${process.env.COORDINATOR_PASSWORD ? '[Configured]' : 'coord123 (Default)'}`);
  console.log(` Health Check: http://localhost:${PORT}/`);
  console.log(`======================================================\n`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nCRITICAL ERROR: Port ${PORT} is already in use.`);
    console.error(`Another instance is running. Kill existing node process or change PORT in .env.`);
    process.exit(1);
  } else {
    console.error('\n[SERVER ERROR]', error);
  }
});
