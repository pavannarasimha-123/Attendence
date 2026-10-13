# 🚀 Deploying Backend to Render

Follow these steps to deploy your **Smart Attendance** backend to [Render.com](https://render.com).

## 1. Create a New Web Service
1.  Log in to your [Render Dashboard](https://dashboard.render.com).
2.  Click **"New +"** and select **"Web Service"**.
3.  Choose **"Build and deploy from a Git repository"**.
4.  Connect your GitHub account and select the **`department-attendece`** repository.

## 2. Configure Service Settings
On the "Create Web Service" page, use these settings:

-   **Name**: `smart-attendance-backend` (or your choice)
-   **Region**: Select the one closest to you (e.g., Singapore or Mumbai if available).
-   **Branch**: `main`
-   **Root Directory**: `backend`  <-- **CRITICAL: Set this to `backend`**
-   **Runtime**: `Node`
-   **Build Command**: `npm install`
-   **Start Command**: `node server.js`
-   **Instance Type**: `Free` (or higher if preferred)

## 3. Set Environment Variables
Go to the **"Environment"** tab in your service settings and add these variables:

| Key | Value |
| :--- | :--- |
| `PORT` | `10000` (Render default) |
| `SPREADSHEET_ID` | *Your Google Sheet ID* |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | *Your service account email* |
| `GOOGLE_PRIVATE_KEY` | *See Important Note Below* |
| `SPOT_REGISTRATION_PASSWORD` | *Your chosen portal password* |

### ⚠️ IMPORTANT: Google Private Key Formatting
Render handles newlines differently. When pasting your `GOOGLE_PRIVATE_KEY`:
1.  Ensure it includes the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines.
2.  If you have `\n` in your `.env` file, Render might need them to be actual newlines.
3.  **Best Practice**: Copy the *entire block* from your JSON key file (including the actual line breaks) and paste it directly into the Render secret value box. If it fails, try wrapping it in double quotes.

## 4. Update Frontend API URL
Once deployed, Render will give you a URL (e.g., `https://smart-attendance-backend.onrender.com`).
1.  Open `frontend/src/services/api.js` in your local project.
2.  Update the `BASE_URL` to point to your new Render URL.
3.  Commit and push this change to GitHub so your frontend knows where the backend lives.

## 5. Deployment Completed
Render will automatically start the build. Once the logs say `"Server running on port 10000"`, your backend is alive!

---
> [!TIP]
> **Spin-down**: Free Tier Render services spin down after 15 minutes of inactivity. The first request after a break might take 1-2 minutes to "wake up" the server.
