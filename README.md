# Smart Attendance System (CSE Department)

A premium, full-stack web application designed for efficient attendance tracking using QR codes. Optimized for the CSE Department with a modern glassmorphic UI and real-time backend synchronization with Google Sheets.

## 🚀 Key Features

*   **QR Scanner**: High-performance scanner with auto-focus and mobile-optimized flip controls.
*   **HOD Dashboard**: Real-time "Quick Stats" (Total, Present, Absent) with dynamic filtering by **Semester** and **Branch**.
*   **Manual Entry**: Fast fallback for roll number entry.
*   **PDF/CSV Export**: Generate professional attendance reports directly from the dashboard.
*   **Concurrency Guard**: Built-in Mutex locking and Row Caching to prevent data loss during high traffic.

---

## 🛠️ Deployment Guide

### Prerequisites
- Node.js (v16+)
- npm or yarn
- A Google Cloud Service Account (for Sheets API)

### 1. Google Sheets Setup
Follow the detailed [Setup Guide](./setup_guide.md) to:
1.  Create a Google Cloud Project.
2.  Enable the **Google Sheets API**.
3.  Create a **Service Account** and download the **JSON Key**.
4.  Share your Google Sheet with the Service Account email as an **Editor**.

### 2. Backend Configuration
1.  Navigate to the `backend/` folder.
2.  Install dependencies: `npm install`.
3.  Create a `.env` file and add the following:
    ```env
    PORT=3000
    SPREADSHEET_ID=your_id_here
    GOOGLE_SERVICE_ACCOUNT_EMAIL=your_email_here
    GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----"
    SPOT_REGISTRATION_PASSWORD=your_dashboard_password
    ```

### 3. Frontend Configuration
1.  Navigate to the `frontend/` folder.
2.  Install dependencies: `npm install`.
3.  Run the development server: `npm run dev`.

### 4. Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
node server.js
```

---

## 📖 Usage Guide

### 🧑‍💻 For Event Coordinators
1.  **QR Scanner Tab**: Point your camera at the student's ID/QR code. A green success badge will appear once marked.
2.  **Manual Entry**: Use this if a student's card is damaged.

### 🏛️ For HOD / Administration
1.  Click **"HOD Login"** at the top right.
2.  Enter the security password.
3.  Use the **Semester** and **Branch** dropdowns to filter student data.
4.  View live counts in the **Quick Stats** panel.
5.  Click **"Export PDF"** to download a formatted report of the filtered view.

---

## 📁 Project Structure
- `backend/`: Express server, Google Sheets API integration, and Mutex locking.
- `frontend/`: React + Tailwind CSS + Vite application.
- `public/`: Assets like the premium CSE Logo.

---

## ✅ Final License
&copy; 2026 CSE Department. All Rights Reserved.
