import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { handleConsultation } from "../src/lib/server/consultation.ts";

const source = readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");
const secret = "test-only-secret-with-at-least-32-characters";
const data = { fullName: "Nguyễn Kiểm Thử", phone: "0912345678", location: "Quảng Ninh, Hạ Long", consultationType: "solution", productCategory: "grout", otherProductCategory: "", note: "", privacyConsent: true };

function harness() {
  const rows: unknown[][] = [];
  const properties: Record<string, string> = { GOOGLE_APPS_SCRIPT_SECRET: secret, SPREADSHEET_ID: "test-sheet", SHEET_NAME: "Leads" };
  let released = 0;
  let maxColumns = 15;
  const hiddenColumns: number[][] = [];
  function range(row: number, column: number, count = 1, width = 1) {
    return {
      setValues(values: unknown[][]) {
        values.forEach((valuesRow, index) => {
          rows[row - 1 + index] ??= [];
          valuesRow.forEach((value, offset) => { rows[row - 1 + index][column - 1 + offset] = value; });
        });
        return this;
      },
      setNumberFormat() { return this; },
      getValues() { return Array.from({ length: count }, (_, index) => Array.from({ length: width }, (_, offset) => rows[row - 1 + index]?.[column - 1 + offset] ?? "")); },
      getValue() { return rows[row - 1]?.[column - 1]; },
      createTextFinder(value: string) {
        return {
          matchEntireCell() { return this; },
          findNext() {
            for (let index = row - 1; index < row - 1 + count; index++) {
              if (rows[index]?.[column - 1] === value) return { getRow: () => index + 1 };
            }
            return null;
          },
        };
      },
    };
  }
  const sheet = {
    getLastRow: () => rows.length, getRange: range, setFrozenRows() {},
    getMaxColumns: () => maxColumns,
    insertColumnsAfter: (_position: number, count: number) => { maxColumns += count; },
    hideColumns: (position: number, count: number) => { hiddenColumns.push([position, count]); },
  };
  const spreadsheet = { getSheetByName: () => sheet, insertSheet: () => sheet };
  const context = vm.createContext({
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (text: string) => ({ setMimeType: () => JSON.parse(text) }),
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (key: string) => properties[key] ?? null,
      getProperties: () => ({ ...properties }),
      setProperty: (key: string, value: string) => { properties[key] = value; },
      deleteProperty: (key: string) => { delete properties[key]; },
    }) },
    Utilities: {
      Charset: { UTF_8: "utf8" }, DigestAlgorithm: { SHA_256: "sha256" },
      computeHmacSha256Signature: (text: string, key: string) => [...createHmac("sha256", key).update(text).digest()],
      computeDigest: (_algorithm: string, text: string) => [...createHash("sha256").update(text).digest()],
      formatDate: (_date: Date, zone: string, format: string) => {
        assert.equal(zone, "Asia/Ho_Chi_Minh");
        assert.equal(format, "dd/MM/yyyy HH:mm:ss");
        return "20/10/2026 13:00:00";
      },
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => { released++; } }) },
    SpreadsheetApp: { openById: () => spreadsheet, flush() {} },
  });
  vm.runInContext(source, context);
  function submit(id = randomUUID(), lead = data, timestamp = Date.now(), signatureOverride?: string) {
    const payload = JSON.stringify({ requestId: id, data: lead, consentVersion: "2026-10-20", rateKey: createHmac("sha256", secret).update(lead.phone).digest("hex") });
    const signature = signatureOverride ?? createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    context.inputEvent = { postData: { contents: JSON.stringify({ timestamp, payload, signature }) } };
    return vm.runInContext("doPost(inputEvent)", context) as { ok: boolean; status?: string; code?: string; requestId?: string };
  }
  function receive(body: string) {
    context.inputEvent = { postData: { contents: body } };
    return vm.runInContext("doPost(inputEvent)", context) as { ok: boolean; status?: string; code?: string; requestId?: string };
  }
  return { rows, properties, submit, receive, hiddenColumns, released: () => released };
}

test("Apps Script rejects invalid signatures and expired envelopes without writing rows", () => {
  const h = harness();
  assert.equal(h.submit(randomUUID(), data, Date.now(), "invalid").code, "UNAUTHORIZED");
  assert.equal(h.submit(randomUUID(), data, Date.now() - 400000).code, "UNAUTHORIZED");
  assert.equal(h.rows.length, 0);
});

test("Apps Script saves once, preserves phone text, and confirms an identical retry", () => {
  const h = harness();
  const id = randomUUID();
  assert.equal(h.submit(id).status, "saved");
  assert.equal(h.submit(id).status, "duplicate");
  assert.equal(h.rows.length, 2);
  assert.equal(h.rows[1][2], "0912345678");
  assert.equal(h.rows[1][5], "Tư vấn giải pháp");
  assert.equal(h.rows[1][6], "Keo chà ron");
  assert.equal(h.released(), 2);
});

test("Apps Script prevents same ID being used for different content", () => {
  const h = harness();
  const id = randomUUID();
  h.submit(id);
  assert.equal(h.submit(id, { ...data, note: "Changed" }).code, "IDEMPOTENCY_CONFLICT");
  assert.equal(h.rows.length, 2);
});

test("Apps Script applies durable per-phone limits but allows a retry of a saved request", () => {
  const h = harness();
  const first = randomUUID();
  assert.equal(h.submit(first).status, "saved");
  assert.equal(h.submit().status, "saved");
  assert.equal(h.submit().status, "saved");
  assert.equal(h.submit().code, "RATE_LIMITED");
  assert.equal(h.submit(first).status, "duplicate");
  assert.equal(h.rows.length, 4);
});

test("Apps Script rejects invalid lead data and escapes spreadsheet formulas", () => {
  const h = harness();
  assert.equal(h.submit(randomUUID(), { ...data, privacyConsent: false }).code, "INVALID_DATA");
  assert.equal(h.submit(randomUUID(), { ...data, productCategory: "other", otherProductCategory: "" }).code, "INVALID_DATA");
  assert.equal(h.submit(randomUUID(), { ...data, note: '=HYPERLINK("https://example.test")' }).status, "saved");
  assert.equal(h.rows[1][8], '\'=HYPERLINK("https://example.test")');
});

test("Apps Script writes the exact A–O client layout and keeps audit metadata hidden", () => {
  const h = harness();
  const id = randomUUID();
  h.properties.SOURCE_PAGE = "Bài SEM chống thấm mái";
  assert.equal(h.submit(id, { ...data, productCategory: "other", otherProductCategory: "Vật liệu khác", note: "Mái sân thượng bị thấm" }).status, "saved");
  assert.deepEqual(h.rows[0].slice(0, 15), ["Thời gian gửi", "Họ và Tên", "Số Điện Thoại", "Tỉnh/Thành phố", "Quận/Huyện", "Nhu cầu", "Hệ sản phẩm cần tư vấn", "Thông tin khác", "Ghi chú thêm", "Nguồn lead", "Bài viết/Trang nguồn", "Trạng thái xử lý", "Nhân viên phụ trách", "Ngày liên hệ", "Kết quả tư vấn"]);
  assert.deepEqual(h.rows[1].slice(0, 15), ["20/10/2026 13:00:00", data.fullName, "0912345678", "Quảng Ninh", "Hạ Long", "Tư vấn giải pháp", "Khác", "Vật liệu khác", "Mái sân thượng bị thấm", "Website", "Bài SEM chống thấm mái", "Mới", "", "", ""]);
  assert.equal(h.rows[1][15], id);
  assert.match(String(h.rows[1][16]), /^[a-f0-9]{64}$/);
  assert.equal(h.rows[1][17], "Có");
  assert.equal(h.rows[1][18], "2026-10-20");
  assert.deepEqual(h.hiddenColumns[0], [16, 4]);
});

test("Apps Script independently rejects missing, extra and empty comma-separated location parts", () => {
  const h = harness();
  for (const location of ["Hạ Long", "Quảng Ninh,", ", Hạ Long", "Quảng Ninh, Hạ Long, Bãi Cháy", "Quảng Ninh,\nHạ Long"]) {
    assert.equal(h.submit(randomUUID(), { ...data, location }).code, "INVALID_DATA", location);
  }
  assert.equal(h.rows.length, 0);
});

test("existing wrapped template headers and staff-managed fields are preserved", () => {
  const h = harness();
  h.submit();
  h.rows[0][3] = "Tỉnh/Thành\nphố";
  h.rows[0][6] = "Hệ sản phẩm\ncần tư vấn";
  h.rows[1][11] = "Đang xử lý";
  h.rows[1][12] = "Nhân viên A";
  h.rows[1][13] = "21/10/2026";
  h.rows[1][14] = "Đã tư vấn";
  assert.equal(h.submit().status, "saved");
  assert.equal(h.rows[0][3], "Tỉnh/Thành\nphố");
  assert.deepEqual(h.rows[1].slice(11, 15), ["Đang xử lý", "Nhân viên A", "21/10/2026", "Đã tư vấn"]);
});

test("existing template gets metadata headers only if P–S are empty", () => {
  const h = harness();
  h.submit();
  h.rows[0] = h.rows[0].slice(0, 15);
  h.rows[1] = h.rows[1].slice(0, 15);
  assert.equal(h.submit().status, "saved");
  assert.equal(h.rows[0][15], "Request ID");
  const occupied = harness();
  occupied.submit();
  occupied.rows[0] = occupied.rows[0].slice(0, 15);
  occupied.rows[1] = occupied.rows[1].slice(0, 15);
  occupied.rows[1][15] = "Existing customer data";
  assert.equal(occupied.submit().code, "INVALID_SHEET_METADATA");
  assert.equal(occupied.rows[1][15], "Existing customer data");
  assert.equal(occupied.rows.length, 2);
});

test("actual API envelope is accepted by the Apps Script receiver and a retry saves only once", async () => {
  const h = harness();
  const environment = {
    APP_URL: "https://jorakay.example", GOOGLE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/test/exec",
    GOOGLE_APPS_SCRIPT_SECRET: secret, NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-site",
    TURNSTILE_SECRET_KEY: "test-secret", PRIVACY_POLICY_VERSION: "2026-10-20",
  };
  const id = randomUUID();
  const fetcher = (async (url, init) => {
    if (String(url).includes("siteverify")) return Response.json({ success: true, action: "consultation", hostname: "jorakay.example" });
    return Response.json(h.receive(String(init?.body)));
  }) as typeof fetch;
  for (let attempt = 0; attempt < 2; attempt++) {
    const req = new Request(`${environment.APP_URL}/api/consultation`, {
      method: "POST", headers: { origin: environment.APP_URL, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { ...data, phone: "+84912345678" }, submissionId: id, website: "", turnstileToken: "fresh-token" }),
    });
    assert.equal((await handleConsultation(req, environment, fetcher)).status, 200);
  }
  assert.equal(h.rows.length, 2);
});
