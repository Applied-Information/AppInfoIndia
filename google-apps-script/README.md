# Enquiry form → Google Sheet

The popup form on the landing page posts to a Google Apps Script web app, which appends each enquiry as a row in the leads sheet.

## One-time setup (about 5 minutes)

1. Open the sheet: https://docs.google.com/spreadsheets/d/1SJah-DIdy1tRZS76yvyMHhavlogKx89Nm2S_VW6hwe0/edit
2. Go to **Extensions → Apps Script**.
3. Delete the starter code and paste in everything from `Code.gs`. Click **Save**.
4. Click **Deploy → New deployment**.
   - Gear icon → **Web app**
   - Description: `Landing page leads`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, then approve the permissions prompt (Advanced → Go to project → Allow).
6. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/XXXX/exec`.
7. Paste it into `assets/js/main.js`:

   ```js
   const SHEET_ENDPOINT = 'https://script.google.com/macros/s/XXXX/exec';
   ```

8. Open the web app URL in a browser. You should see `"ok":true`. Then submit the form on the page and check the sheet for the new row.

The header row (Timestamp, Full Name, Email, …) is created automatically on the first submission.

## Changing the script later

After editing `Code.gs`, use **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. This keeps the same URL. Creating a *new* deployment gives a new URL, which you would then need to paste into `main.js` again.
