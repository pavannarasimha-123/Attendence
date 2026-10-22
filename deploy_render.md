# 🚀 Deploy Entire Smart Attendance App to Render (Frontend + Backend)

You can deploy the **entire application** (React Frontend + Express Backend) together as a **single unified Web Service** on Render.

---

## 1. Create a Web Service on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **"New +"** (top right) and select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"**.
4. Connect your GitHub account and select **`pavannarasimha-123/Attendence`**.

---

## 2. Configure Service Settings

Use these exact settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `smart-attendance` (or your choice) |
| **Region** | Singapore or Frankfurt (closest to you) |
| **Branch** | `main` |
| **Root Directory** | *(Leave blank / empty)* |
| **Runtime** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

> [!NOTE]
> When `npm run build` runs, Render will automatically install all dependencies, build the React frontend, and prepare the Express server to serve the full app.

---

## 3. Environment Variables (Optional / Recommended)

Go to the **"Environment"** tab and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| **`PORT`** | `10000` | Render's default web port |
| **`SPOT_REGISTRATION_PASSWORD`** | `admin123` | Password for HOD Admin portal (or your custom password) |
| **`COORDINATOR_PASSWORD`** | `coord123` | Password for Coordinator portal (or your custom password) |
| **`USE_LOCAL_STORAGE`** | `auto` | Set to `true` to use local storage, or leave `auto` |

### If connecting to Google Sheets:
| Key | Value |
| :--- | :--- |
| **`SPREADSHEET_ID`** | *Your Google Sheet ID* |
| **`GOOGLE_SERVICE_ACCOUNT_EMAIL`** | *Your service account email* |
| **`GOOGLE_PRIVATE_KEY`** | *Your complete private key including `-----BEGIN PRIVATE KEY-----`* |

*(If you don't provide Google credentials, the server automatically runs in Local Database mode with pre-seeded student data).*

---

## 4. Click "Create Web Service"

1. Click **"Create Web Service"** at the bottom.
2. Render will run:
   - `npm run build` (builds backend and frontend)
   - `npm start` (starts the unified server)
3. Once the logs show:
   ```
   [STATIC] Unified mode: Serving frontend from frontend/dist
   Smart Attendance Server running on port 10000
   ```
4. Click on your Render URL (e.g. `https://smart-attendance.onrender.com`).
5. **Done!** Both your React UI and Backend API will be live on that single link.

---

### 💡 Tips
* **No CORS Issues**: Because frontend and backend are hosted on the same origin, all API calls work natively.
* **Camera Access**: Render provides HTTPS by default (`https://...`), which enables mobile and web camera access for QR scanning.
