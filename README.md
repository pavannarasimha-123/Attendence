# Smart Attendance System (CSE Department)

> 🌐 **Live Deployment**: **[https://smart-attendance-ortn.onrender.com/](https://smart-attendance-ortn.onrender.com/)**

A premium, full-stack web application designed for high-throughput attendance tracking using QR codes and spot registration. Optimized for college departments with a modern glassmorphic UI, real-time backend synchronization with Google Sheets, and an automated local database fallback for offline/instant deployment.

---

## 🚀 Key Features

* 📷 **QR Scanner**: Fast real-time camera scanner with continuous autofocus, camera flip support, audio feedback, and queue handling.
* ✍️ **Manual Entry**: Roll number fallback with direct one-click redirect to Spot Registration if student is not registered.
* 📝 **Spot Registration**: Add walk-in attendees instantly with Name, Roll Number, Branch, Semester, and Section, with auto-marking as Present.
* 🪪 **QR Code & Badge Generator**: Generate instant student QR codes (downloadable PNG) and batch-generate printable 2x4 ID badge sheets as formatted PDFs (`jsPDF`).
* 📊 **HOD Analytics Dashboard**:
  * Real-time Quick Stats (Total, Present, Absent) with live search and filtering by Semester, Branch, and Attendance Status.
  * Formatted PDF and CSV / Excel report generation.
  * Bulk Attendance Reset with security confirmation modal.
* ⚡ **Dual Storage Architecture**:
  * **Google Sheets Sync**: Direct integration using Google Service Account JWT & Mutex locking.
  * **Local Database Fallback**: Automatically switches to local JSON store (`backend/data/students.json`) if Google credentials are not configured, enabling instant zero-setup local runs.

---

## 🌐 Live Access & Credentials

* **Live App**: [https://smart-attendance-ortn.onrender.com/](https://smart-attendance-ortn.onrender.com/)
* **Event Coordinator Portal**: Password `coord123`
* **HOD / Admin Portal**: Password `admin123`

---

## 🚀 Quick Start (Local Development)

From the root directory:

```bash
# 1. Install all dependencies (backend + frontend)
npm run install:all

# 2. Start both backend and frontend concurrently
npm run dev
```

* **Frontend**: [http://localhost:5173](http://localhost:5173)
* **Backend**: [http://localhost:3000](http://localhost:3000)

## 🛠️ Configuration & Google Sheets Setup

### Option A: Local Mode (Default / Offline)
No setup required! The server will automatically use `backend/data/students.json` seeded with sample student data across CSE, AI & DS, and ECE.

### Option B: Google Sheets Sync
1. Follow the [Google Sheets Setup Guide](./setup_guide.md) to obtain your Service Account JSON key.
2. Edit `backend/.env`:
```env
PORT=3000
SPREADSHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="your_private_key"
SPOT_REGISTRATION_PASSWORD=your_admin_password
COORDINATOR_PASSWORD=your_coordinator_password
USE_LOCAL_STORAGE=false
```
3. Share your Google Sheet with the Service Account email as **Editor**.
4. Restart the server:
```bash
npm run dev
```

---

## 📁 Project Structure

```
Attendence/
├── package.json                 # Root script runner (dev, install:all, build)
├── render.yaml                  # Render deployment blueprint
├── README.md                    # Project documentation
├── setup_guide.md               # Step-by-step Google Cloud Sheets guide
├── deploy_render.md             # Render deployment instructions
├── backend/
│   ├── data/
│   │   ├── defaultStudents.json # Initial seed template
│   │   └── students.json        # Local storage database
│   ├── server.js                # Express API with Mutex locking & dual storage
│   ├── package.json             # Backend dependencies
│   ├── .env.example             # Environment template
│   └── .env                     # Local configuration
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── RoleSelection.jsx    # Portal selector (Coordinator vs HOD)
    │   │   ├── CoordinatorLogin.jsx # Coordinator auth
    │   │   ├── AdminLogin.jsx       # HOD auth, stats, table preview & PDF/CSV export
    │   │   ├── Scanner.jsx          # Live QR camera scanner
    │   │   ├── ManualEntry.jsx      # Manual roll number check-in
    │   │   ├── SpotRegistration.jsx # On-the-spot student registration
    │   │   ├── QRGenerator.jsx      # Student badge & QR code maker
    │   │   ├── AttendanceList.jsx   # Live search table & CSV download
    │   │   ├── ServerWakeup.jsx     # Cloud server connection detector
    │   │   └── SplashScreen.jsx     # Animated entrance splash
    │   ├── services/
    │   │   ├── api.js               # Axios API client
    │   │   └── scannerService.js    # Camera lifecycle management
    │   ├── App.jsx                  # Main coordinator layout & tab routing
    │   └── main.jsx
    └── package.json                 # Frontend dependencies (React 19, Tailwind, Vite)
```

---

## 📖 User Workflow

1. **Badge Printing (Pre-Event)**:
   * Event coordinators open the **QR & Badges** tab.
   * Click **Print All Badges PDF** to generate physical attendee passes with QR codes.
2. **Event Check-in**:
   * Coordinators scan student QR passes with the **QR Scanner** tab (or type roll number in **Manual Entry**).
   * For unregistered or walk-in attendees, coordinators click **Spot Registration** to add them and mark attendance instantly.
3. **Administration & Reporting**:
   * Department Heads log in via **HOD Dashboard**.
   * Filter attendees by semester, branch, and status.
   * Download official reports as **PDF** or **CSV**.
   * When an event concludes, use **Reset Attendance** to clear records for the next session.

---

## 📜 License
&copy; 2026 CSE Department. All Rights Reserved.
