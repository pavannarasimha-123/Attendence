# 🚀 Deploying Frontend to Vercel

Follow these steps to deploy your **Smart Attendance** frontend to [Vercel](https://vercel.com).

## 1. Import Your Project
1.  Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** and select **"Project"**.
3.  Find your **`department-attendece`** repository and click **"Import"**.

## 2. Configure Project Settings
On the "Configure Project" screen, use these settings:

-   **Project Name**: `smart-attendance-frontend` (or your choice)
-   **Framework Preset**: Select **"Vite"** (Vercel usually detects this automatically).
-   **Root Directory**: Click "Edit" and select the **`frontend`** folder. <-- **CRITICAL: Set this to `frontend`**

## 3. Set Environment Variables
Expand the **"Environment Variables"** section and add the link to your backend:

| Key | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://your-backend-url.onrender.com` |

> [!IMPORTANT]
> Make sure there is **no trailing slash** at the end of your URL (e.g., use `...onrender.com`, NOT `...onrender.com/`).

## 4. Deploy!
1.  Click **"Deploy"**.
2.  Wait for the build to finish (usually less than 1 minute).
3.  Vercel will give you a public URL (e.g., `https://smart-attendance.vercel.app`).

## 5. (Optional) Custom Domain
If you have a custom domain from GoDaddy or Namecheap, you can add it in the **"Settings" > "Domains"** tab of your Vercel project.

---
### 💡 Troubleshooting
- **White Screen?** Check the browser console (F12). If you see "404" or "Network Error", ensure your `VITE_API_URL` is correct and your backend on Render is currently running.
- **Scanner Not Working?** Vercel deployments use HTTPS by default, which is **required** for the camera to work. Ensure you are accessing your site via `https://`.
