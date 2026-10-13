const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { HttpsProxyAgent } = require('https-proxy-agent');
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

// Initialize Auth - using service account
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
  console.error('CRITICAL ERROR: Missing Google Credentials in .env');
  process.exit(1);
}

if (!process.env.SPOT_REGISTRATION_PASSWORD) {
  console.error('CRITICAL ERROR: Missing SPOT_REGISTRATION_PASSWORD in .env');
  process.exit(1);
}

// Sanitize the private key:
let privateKey = process.env.GOOGLE_PRIVATE_KEY;
if (privateKey) {
  // Replace literal '\n' characters with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  // Remove surrounding double-quotes if they were accidentally pasted
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
}

// Configure Proxy if present
const proxyUrl = process.env.HTTPS_PROXY;
if (proxyUrl) {
  console.log(`[PROXY] Detected HTTPS_PROXY: ${proxyUrl}`);
}

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  // Pass the proxy agent to the underlying request library (gaxios)
  ...(proxyUrl ? { options: { agent: new HttpsProxyAgent(proxyUrl) } } : {})
});

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);

/**
 * Ensures the Google Sheet is loaded and accessible.
 * Throws an error with a descriptive message if it fails.
 */
async function ensureDocLoaded() {
  try {
    // Check if info is already loaded. Use try-catch because 
    // accessing sheetCount throws if not loaded.
    try {
      if (doc.sheetCount > 0) return;
    } catch (e) {
      // Info not loaded yet, proceed to load
    }

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
const CACHE_TTL = 30000; // 30 seconds for general data
const SCAN_CACHE_TTL = 5000; // 5 seconds during active scanning

/**
 * Ensures only one Google Sheets operation (write/heavy read) happens at a time.
 * Includes a timeout to prevent deadlocks.
 */
async function withLock(fn, timeoutMs = 15000) {
  // Rate limiting: If queue is too deep (e.g., more than 10 people waiting), 
  // return 429 Too Many Requests to the client.
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
    // Add built-in retry for common Google API transient errors
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
    // Error handled in the promise wrapper via reject
  } finally {
    isOperating = false;
    // Faster turnover for higher throughput (30ms)
    setTimeout(processQueue, 30);
  }
}

/**
 * Gets rows, using cache if fresh enough.
 * @param {boolean} forceRefresh - If true, ignores cache.
 * @param {number} customTtl - Optional override for TTL.
 */
async function getCachedRows(forceRefresh = false, customTtl = CACHE_TTL) {
  const now = Date.now();
  if (!forceRefresh && cachedRows && (now - lastCacheUpdate < customTtl)) {
    return { rows: cachedRows, map: studentMap };
  }

  await ensureDocLoaded();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  // Rebuild the student map (indexing) for O(1) lookups
  const newMap = new Map();
  rows.forEach(row => {
    const roll = row.get('Rollnumber');
    if (roll) {
      newMap.set(roll.toString().trim().toLowerCase(), row);
    }
  });

  cachedRows = rows;
  studentMap = newMap;
  lastCacheUpdate = Date.now();
  return { rows: cachedRows, map: studentMap };
}

// API to Mark Attendance
app.post('/api/mark-attendance', async (req, res) => {
  const { rollNo } = req.body;

  if (!rollNo) {
    return res.status(400).json({ error: 'Roll Number is required' });
  }

  // Use Mutex to prevent concurrent write conflicts
  return withLock(async () => {
    // Report how many people are waiting (for UI feedback)
    const currentQueueDepth = queue.length;

    console.log(`\n[API] Processing Scan for: "${rollNo}" (Queue: ${currentQueueDepth})`);
    try {
      // Get fresh data or cache. Map lookup is nearly instant (O(1)).
      const { map } = await getCachedRows(lastCacheUpdate === 0, SCAN_CACHE_TTL);
      const studentRow = map.get(rollNo.toString().trim().toLowerCase());

      if (!studentRow) {
        console.warn(`[API] Roll Number not found: ${rollNo}`);
        return res.status(409).json({
          error: `Student registration not found. Roll Number "${rollNo}" is not in the system.`,
          queueDepth: currentQueueDepth,
          rollNo: rollNo,
          suggestion: "Please check the Roll Number or register the student in the Google Sheet."
        });
      }

      const currentStatus = studentRow.get('isPresent');
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
            name: studentRow.get('Name'),
            rollNo: studentRow.get('Rollnumber'),
            branch: studentRow.get('Branch')
          }
        });
      }

      console.log(`[API] Saving status for ${rollNo}...`);
      studentRow.set('isPresent', 'TRUE');
      await studentRow.save();

      // IMPORTANT: Invalidate cache for the next person in the queue
      lastCacheUpdate = 0;

      return res.status(200).json({
        message: 'Marked Present',
        queueDepth: currentQueueDepth,
        student: {
          name: studentRow.get('Name'),
          rollNo: studentRow.get('Rollnumber'),
          branch: studentRow.get('Branch'),
          semester: studentRow.get('semester')
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

    const students = Array.isArray(rows) ? rows.map(row => ({
      name: row.get('Name') || 'Unknown',
      rollNo: row.get('Rollnumber') || 'N/A',
      branch: row.get('Branch') || 'N/A',
      year: row.get('Year of Study') || row.get('Year') || '',
      semester: row.get('semester') || row.get('Semester') || row.get('Sem') || '',
      section: row.get('Section') || row.get('section') || '',
      isPresent: row.get('isPresent') === 'TRUE' || row.get('isPresent') === 'Present' || row.get('isPresent') === true
    })) : [];

    res.json(students);
  } catch (error) {
    console.error('[API ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API to Verify Portal Password (Admin)
app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.SPOT_REGISTRATION_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  return res.status(200).json({ message: 'Password verified' });
});

// API to Verify Coordinator Password
app.post('/api/verify-coordinator', (req, res) => {
  const { password } = req.body;
  const expectedPassword = process.env.COORDINATOR_PASSWORD || process.env.SPOT_REGISTRATION_PASSWORD;

  if (!password || password !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid coordinator password' });
  }
  return res.status(200).json({ message: 'Coordinator access granted' });
});


app.get('/', (req, res) => {
  res.send('Attendance Backend is Running');
});

// API to Clear All Attendance (Reset for next event)
app.post('/api/clear-attendance', async (req, res) => {
  const { password } = req.body;

  // Basic security check (uses the same HOD/Portal password)
  if (!password || password !== process.env.SPOT_REGISTRATION_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized: Invalid portal password' });
  }

  console.log('\n[ADMIN] Request received to CLEAR ALL attendance markings.');

  return withLock(async () => {
    try {
      await ensureDocLoaded();
      const sheet = doc.sheetsByIndex[0];
      await sheet.loadHeaderRow();
      const headers = sheet.headerValues;
      const isPresentColIndex = headers.indexOf('isPresent');

      if (isPresentColIndex === -1) {
        throw new Error('Column "isPresent" not found in the sheet.');
      }

      // We still need rows to know the count and for cache refreshment logic if needed,
      // but we use loadCells for the actual bulk operation.
      const rows = await sheet.getRows();
      if (rows.length === 0) {
        return res.status(200).json({ message: 'No students found to clear.', clearedCount: 0 });
      }

      console.log(`[ADMIN] Bulk clearing isPresent for ${rows.length} rows...`);

      // Load the specific column for all data rows (startRowIndex 1 is first data row)
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

        // Check if it's currently marked as present
        const isPresent = (
          currentValue === 'TRUE' ||
          currentValue === 'Present' ||
          currentValue === true ||
          (typeof currentValue === 'string' && currentValue.toLowerCase() === 'true')
        );

        if (isPresent) {
          cell.value = ''; // Blank the cell to reduce write operations/limits
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        await sheet.saveUpdatedCells();
      }

      console.log(`[ADMIN] Successfully cleared ${clearedCount} attendance records using bulk update.`);

      // Force cache refresh for everyone
      lastCacheUpdate = 0;
      cachedRows = null;
      studentMap = new Map();

      return res.status(200).json({
        message: `Successfully reset attendance for ${clearedCount} students.`,
        clearedCount
      });

    } catch (error) {
      console.error('[ADMIN ERROR] Failed to clear attendance:', error.message);
      return res.status(500).json({ error: 'Failed to reset attendance. ' + error.message });
    }
  }, 60000); // Higher timeout (60s) for bulk operations
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nCRITICAL ERROR: Port ${PORT} is already in use.`);
    console.error(`This usually happens if another instance of the server is already running.`);
    console.error(`Try stopping other nodes or use: fuser -k ${PORT}/tcp`);
    process.exit(1);
  } else {
    console.error('\n[SERVER ERROR]', error);
  }
});
