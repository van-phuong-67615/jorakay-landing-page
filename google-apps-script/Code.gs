/** Customer-owned Apps Script Web App. See docs/GOOGLE_SHEETS_INTEGRATION.md. */
const LEAD_HEADERS = [
  'Thời gian gửi', 'Họ và Tên', 'Số Điện Thoại', 'Tỉnh/Thành phố', 'Quận/Huyện',
  'Nhu cầu', 'Hệ sản phẩm cần tư vấn', 'Thông tin khác', 'Ghi chú thêm',
  'Nguồn lead', 'Bài viết/Trang nguồn', 'Trạng thái xử lý', 'Nhân viên phụ trách',
  'Ngày liên hệ', 'Kết quả tư vấn'
];
// A–O remain the customer template. P–S are reserved, hidden technical columns.
const META_HEADERS = ['Request ID', 'Payload SHA256', 'Đồng ý liên hệ', 'Phiên bản chính sách'];
const META_COLUMN = LEAD_HEADERS.length + 1;

function splitLocation(value) {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) return null;
  const parts = value.split(',').map(function (part) { return part.trim(); });
  return parts.length === 2 && parts[0] && parts[1] ? { province: parts[0], district: parts[1] } : null;
}

function normalizeHeader(value) {
  return String(value).normalize('NFC').replace(/\s/g, '').toLowerCase();
}

function prepareSheet(sheet) {
  const totalColumns = LEAD_HEADERS.length + META_HEADERS.length;
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < totalColumns) sheet.insertColumnsAfter(maxColumns, totalColumns - maxColumns);
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, totalColumns).setValues([LEAD_HEADERS.concat(META_HEADERS)]);
    sheet.setFrozenRows(1);
  } else {
    const headers = sheet.getRange(1, 1, 1, LEAD_HEADERS.length).getValues()[0];
    if (headers.map(normalizeHeader).join('|') !== LEAD_HEADERS.map(normalizeHeader).join('|')) return 'INVALID_SHEET_HEADERS';
    const metaHeaders = sheet.getRange(1, META_COLUMN, 1, META_HEADERS.length).getValues()[0];
    if (metaHeaders.every(function (value) { return value === ''; })) {
      if (lastRow > 1) {
        const metadata = sheet.getRange(2, META_COLUMN, lastRow - 1, META_HEADERS.length).getValues();
        if (metadata.some(function (row) { return row.some(function (value) { return value !== ''; }); })) return 'INVALID_SHEET_METADATA';
      }
      sheet.getRange(1, META_COLUMN, 1, META_HEADERS.length).setValues([META_HEADERS]);
    } else if (metaHeaders.map(normalizeHeader).join('|') !== META_HEADERS.map(normalizeHeader).join('|')) {
      return 'INVALID_SHEET_METADATA';
    }
  }
  sheet.hideColumns(META_COLUMN, META_HEADERS.length);
  return null;
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function hex(bytes) {
  return bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function equalSignature(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function textWithin(value, min, max) {
  return typeof value === 'string' && value === value.trim() && value.length >= min && value.length <= max;
}

function validLead(payload) {
  const d = payload.data;
  return d && /^[0-9a-f-]{36}$/i.test(payload.requestId)
    && /^[0-9a-f]{64}$/.test(payload.rateKey)
    && textWithin(payload.consentVersion, 1, 100)
    && textWithin(d.fullName, 2, 100) && /^0[35789]\d{8}$/.test(d.phone)
    && textWithin(d.location, 1, 200) && splitLocation(d.location)
    && ['product-quote', 'solution'].indexOf(d.consultationType) >= 0
    && ['tile-adhesive', 'grout', 'waterproofing', 'repair', 'other'].indexOf(d.productCategory) >= 0
    && textWithin(d.otherProductCategory || '', d.productCategory === 'other' ? 1 : 0, 200)
    && textWithin(d.note || '', 0, 1000) && d.privacyConsent === true;
}

// Escape formula-like values; text format also preserves a phone's leading zero.
function safeCell(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
}

// Called only while holding the script lock. Durable across server instances.
function consumeRateLimit(properties, rateKey, now) {
  const all = properties.getProperties();
  Object.keys(all).forEach(function (key) {
    if (key.indexOf('rate:') === 0) {
      try { if (JSON.parse(all[key]).expires <= now) properties.deleteProperty(key); }
      catch (_) { properties.deleteProperty(key); }
    }
  });
  const policies = [
    { key: 'rate:phone:' + rateKey + ':' + Math.floor(now / 600000), limit: 3, window: 600000 },
    { key: 'rate:global:' + Math.floor(now / 60000), limit: 60, window: 60000 }
  ];
  const states = policies.map(function (policy) {
    const previous = properties.getProperty(policy.key);
    return { policy: policy, count: previous ? JSON.parse(previous).count : 0 };
  });
  if (states.some(function (state) { return state.count >= state.policy.limit; })) return false;
  states.forEach(function (state) {
    properties.setProperty(state.policy.key, JSON.stringify({ count: state.count + 1, expires: (Math.floor(now / state.policy.window) + 1) * state.policy.window }));
  });
  return true;
}

function doPost(event) {
  let lock;
  let locked = false;
  try {
    const raw = event && event.postData && event.postData.contents;
    if (!raw || raw.length > 20000) return jsonResponse({ ok: false, code: 'INVALID_REQUEST' });
    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty('GOOGLE_APPS_SCRIPT_SECRET');
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    const sheetName = properties.getProperty('SHEET_NAME');
    if (!secret || secret.length < 32 || !spreadsheetId || !sheetName) return jsonResponse({ ok: false, code: 'NOT_CONFIGURED' });
    const envelope = JSON.parse(raw);
    const now = Date.now();
    if (!Number.isSafeInteger(envelope.timestamp) || Math.abs(now - envelope.timestamp) > 300000 || typeof envelope.payload !== 'string') {
      return jsonResponse({ ok: false, code: 'UNAUTHORIZED' });
    }
    const expected = hex(Utilities.computeHmacSha256Signature(envelope.timestamp + '.' + envelope.payload, secret, Utilities.Charset.UTF_8));
    if (!equalSignature(envelope.signature, expected)) return jsonResponse({ ok: false, code: 'UNAUTHORIZED' });
    const payload = JSON.parse(envelope.payload);
    if (!validLead(payload)) return jsonResponse({ ok: false, code: 'INVALID_DATA' });
    // Derive the throttle key independently instead of trusting a supplied key.
    if (!equalSignature(payload.rateKey, hex(Utilities.computeHmacSha256Signature(payload.data.phone, secret, Utilities.Charset.UTF_8)))) {
      return jsonResponse({ ok: false, code: 'INVALID_DATA' });
    }
    const fingerprint = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify({ data: payload.data, consentVersion: payload.consentVersion }), Utilities.Charset.UTF_8));
    lock = LockService.getScriptLock();
    locked = lock.tryLock(10000);
    if (!locked) return jsonResponse({ ok: false, code: 'BUSY' });
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
    const sheetError = prepareSheet(sheet);
    if (sheetError) return jsonResponse({ ok: false, code: sheetError });
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const existing = sheet.getRange(2, META_COLUMN, lastRow - 1, 1).createTextFinder(payload.requestId).matchEntireCell(true).findNext();
      if (existing) {
        const savedHash = sheet.getRange(existing.getRow(), META_COLUMN + 1).getValue();
        return jsonResponse(savedHash === fingerprint
          ? { ok: true, status: 'duplicate', requestId: payload.requestId }
          : { ok: false, code: 'IDEMPOTENCY_CONFLICT' });
      }
    }
    if (!consumeRateLimit(properties, payload.rateKey, now)) return jsonResponse({ ok: false, code: 'RATE_LIMITED' });
    const d = payload.data;
    const location = splitLocation(d.location);
    const consultationLabels = { 'product-quote': 'Báo giá và tư vấn về sản phẩm', solution: 'Tư vấn giải pháp' };
    const productLabels = { 'tile-adhesive': 'Keo dán gạch', grout: 'Keo chà ron', waterproofing: 'Chống thấm', repair: 'Sửa chữa', other: 'Khác' };
    const leadSource = (properties.getProperty('LEAD_SOURCE') || 'Website').trim();
    const sourcePage = (properties.getProperty('SOURCE_PAGE') || 'Tư vấn & báo giá Jorakay').trim();
    const row = [Utilities.formatDate(new Date(now), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'),
      d.fullName, d.phone, location.province, location.district,
      consultationLabels[d.consultationType], productLabels[d.productCategory],
      d.productCategory === 'other' ? d.otherProductCategory : '', d.note || '', leadSource, sourcePage,
      'Mới', '', '', '', payload.requestId, fingerprint, 'Có', payload.consentVersion].map(safeCell);
    sheet.getRange(lastRow + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]);
    SpreadsheetApp.flush();
    return jsonResponse({ ok: true, status: 'saved', requestId: payload.requestId });
  } catch (_) {
    // Never expose exceptions, credentials, or lead data in responses/logs.
    return jsonResponse({ ok: false, code: 'INTERNAL_ERROR' });
  } finally {
    if (locked && lock) lock.releaseLock();
  }
}
