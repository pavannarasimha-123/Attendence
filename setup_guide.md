# Google Sheets API Setup Guide

Follow these steps to generate the required credentials for your application.

## 1. Create a Project in Google Cloud Console
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Click on the project selector (top left) and click **"New Project"**.
3.  Name it (e.g., `Club-Attendance`) and click **Create**.
4.  Wait for the notification that the project is created, then click **Select Project**.

## 2. Enable Google Sheets API
1.  In the left sidebar, navigate to **APIs & Services** > **Library**.
2.  Search for **"Google Sheets API"**.
3.  Click on it and click **Enable**.

## 3. Create a Service Account
1.  Go to **APIs & Services** > **Credentials**.
2.  Click **+ CREATE CREDENTIALS** (top of the page) and select **Service Account**.
3.  **Service account details**:
    - Name: `attendance-bot` (or anything you like).
    - Click **Create and Continue**.
4.  **Grant this service account access to project**:
    - Role: **Editor** (or "Basic" > "Editor"). This is important so it can edit your sheet.
    - Click **Continue** (skipping the "Grant users access" step).
5.  Click **Done**.

## 4. Generate JSON Key
1.  On the **Credentials** page, you will see your new Service Account under the "Service Accounts" section.
2.  Click on the **Email address** of the service account you just created (e.g., `attendance-bot@your-project.iam.gserviceaccount.com`).
3.  Go to the **KEYS** tab (it's one of the tabs near the top of the detail page).
4.  Click **ADD KEY** > **Create new key**.
5.  Select **JSON** and click **Create**.
6.  The JSON file will automatically download to your computer.

## 5. Share Your Google Sheet (CRITICAL STEP)
1.  Open the JSON file you just downloaded.
2.  Find the `"client_email"` field (e.g., `attendance-bot@...`). Copy this email address.
3.  **Go to your Google Sheet**.
4.  Click the **Share** button (top right).
5.  Paste the service account email address into the "Add people and groups" box.
6.  Ensure the permission is set to **Editor**.
7.  Uncheck "Notify people" (optional) and click **Share**.

## 6. Get Your Spreadsheet ID
1.  Look at the URL of your Google Sheet. It looks like this:
    `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUWqnyddUuNN0624v1vE`**`/edit#gid=0`
2.  The long string of random characters between `/d/` and `/edit` is your `SPREADSHEET_ID`.
3.  Copy this ID.

## 7. Update Your .env File
Open your `backend/.env` file and fill in the details:

```env
SPREADSHEET_ID=your_spreadsheet_id_from_step_6
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_client_email_from_json_file
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

> **Note on Private Key**: Be very careful copying the private key. It must include the `\n` characters if it's on a single line, or you must paste the entire block including newlines. The easiest way is to copy the entire `"private_key"` value from the JSON file.
