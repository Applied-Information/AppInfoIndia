/**
 * Receives enquiries from the Applied Information India landing page
 * and appends them to the leads sheet.
 *
 * Setup: see google-apps-script/README.md
 */

const SPREADSHEET_ID = '1SJah-DIdy1tRZS76yvyMHhavlogKx89Nm2S_VW6hwe0';
const SHEET_GID = 0;

// Abuse limits. Apps Script cannot see the caller's IP, so the rate limit is global.
const MAX_PER_MINUTE = 20;          // total submissions accepted per minute
const DUPLICATE_WINDOW_SEC = 600;   // ignore repeat submissions from the same email for 10 min

// Max length per field; anything not listed here is never written
const LIMITS = {
  name: 120, email: 160, phone: 20, organisation: 160, designation: 120,
  city: 80, interest: 120, message: 2000, source: 80, page: 500,
};

const COLUMNS = [
  ['Timestamp', p => new Date()],
  ['Full Name', p => p.name],
  ['Email', p => p.email],
  ['Phone', p => p.phone],
  ['Organisation', p => p.organisation],
  ['Designation', p => p.designation],
  ['City', p => p.city],
  ['Interested In', p => p.interest],
  ['Message', p => p.message],
  ['Source', p => p.source],
  ['Page URL', p => p.page],
];

function doPost(e) {
  const raw = (e && e.parameter) || {};

  // Honeypot: real users never fill this hidden field
  if (raw.website) return json({ ok: true });

  const p = {};
  Object.keys(LIMITS).forEach(k => { p[k] = String(raw[k] == null ? '' : raw[k]).trim().slice(0, LIMITS[k]); });

  const error = validate(p);
  if (error) return json({ ok: false, error });

  const cache = CacheService.getScriptCache();
  const dupKey = 'dup:' + p.email.toLowerCase();
  if (cache.get(dupKey)) return json({ ok: true }); // already recorded, don't add a second row

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json({ ok: false, error: 'Server busy, please try again.' });
  try {
    const rateKey = 'rate:' + Math.floor(Date.now() / 60000);
    const count = Number(cache.get(rateKey) || 0);
    if (count >= MAX_PER_MINUTE) return json({ ok: false, error: 'Too many requests, please try again shortly.' });
    cache.put(rateKey, String(count + 1), 120);

    const sheet = getSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS.map(c => c[0]));
      sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(COLUMNS.map(([, get]) => clean(get(p))));
    cache.put(dupKey, '1', DUPLICATE_WINDOW_SEC);
    return json({ ok: true });
  } catch (err) {
    // Details go to the Apps Script execution log, never back to the browser
    console.error(err);
    return json({ ok: false, error: 'Submission failed.' });
  } finally {
    lock.releaseLock();
  }
}

// Mirrors the checks in assets/js/main.js; the browser checks alone can be bypassed
function validate(p) {
  if (p.name.length < 2) return 'Please enter your name.';
  if (p.organisation.length < 2) return 'Please enter your organisation.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) return 'Please enter a valid email.';
  const digits = (p.phone.match(/\d/g) || []).length;
  if (!/^\+?[0-9 ()-]{7,20}$/.test(p.phone) || digits < 7 || digits > 15) return 'Please enter a valid phone number.';
  if (p.page && !/^https?:\/\//i.test(p.page)) p.page = '';
  return '';
}

// Lets you open the web app URL in a browser to confirm it is live
function doGet() {
  return json({ ok: true, message: 'Applied Information India lead endpoint is running.' });
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheets().find(s => s.getSheetId() === SHEET_GID) || ss.getSheets()[0];
}

// Stop values being interpreted as spreadsheet formulas (formula / CSV injection)
function clean(value) {
  if (value instanceof Date) return value;
  let s = String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
