import assert from "node:assert/strict";
import test from "node:test";
import { consultationSchema, sanitizedPreview } from "../src/lib/validations/consultation.schema.ts";

const valid = {
  fullName: "  Nguyễn Văn A  ", phone: "091 234 5678", location: "  Quảng Ninh ,  Hạ Long  ",
  consultationType: "product-quote", productCategory: "grout", note: "  Ghi chú  ", privacyConsent: true,
};

test("normalizes Vietnamese text and domestic/international phone strings", () => {
  const data = consultationSchema.parse(valid);
  assert.equal(data.fullName, "Nguyễn Văn A");
  assert.equal(data.phone, "0912345678");
  assert.equal(data.location, "Quảng Ninh, Hạ Long");
  assert.equal(data.note, "Ghi chú");
  assert.equal(consultationSchema.parse({ ...valid, phone: "+84 91 234 5678" }).phone, "+84912345678");
});

test("location requires exactly one comma and two non-empty single-line parts", () => {
  for (const location of ["Hạ Long", "Quảng Ninh Hạ Long", ",", "Quảng Ninh,", ", Hạ Long", "Quảng Ninh,   ", "Quảng Ninh,, Hạ Long", "Quảng Ninh, Hạ Long, Bãi Cháy", "Quảng Ninh，Hạ Long", "Quảng Ninh,\nHạ Long"]) {
    const result = consultationSchema.safeParse({ ...valid, location });
    assert.equal(result.success, false, location);
    if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path[0] === "location"));
  }
  assert.equal(consultationSchema.parse({ ...valid, location: "Quảng Ninh,Hạ Long" }).location, "Quảng Ninh, Hạ Long");
  assert.equal(consultationSchema.safeParse({ ...valid, location: `${"x".repeat(198)},y` }).success, false);
  assert.equal(consultationSchema.parse({ ...valid, location: `${"x".repeat(197)},y` }).location.length, 200);
});

test("rejects missing required fields and absent consent", () => {
  const result = consultationSchema.safeParse({ fullName: " ", phone: "", location: "", privacyConsent: false });
  assert.equal(result.success, false);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path[0]);
    for (const field of ["fullName", "phone", "location", "consultationType", "productCategory", "privacyConsent"]) assert.ok(fields.includes(field));
  }
});

test("requires other category description only when other is selected", () => {
  assert.equal(consultationSchema.safeParse({ ...valid, productCategory: "other" }).success, false);
  assert.equal(consultationSchema.safeParse({ ...valid, productCategory: "other", otherProductCategory: "   " }).success, false);
  assert.equal(consultationSchema.safeParse({ ...valid, productCategory: "other", otherProductCategory: "Vật liệu khác" }).success, true);
  assert.equal(consultationSchema.safeParse({ ...valid, note: undefined }).success, true);
});

test("rejects invalid mobile formats and values outside length limits", () => {
  for (const phone of ["123", "0123456789", "09123456789", "+840912345678", "02873000801", "091abcd678", "84912345678"]) {
    assert.equal(consultationSchema.safeParse({ ...valid, phone }).success, false, phone);
  }
  for (const phone of ["0312345678", "0512345678", "0712345678", "0812345678", "0912345678"]) {
    assert.equal(consultationSchema.safeParse({ ...valid, phone }).success, true, phone);
  }
  for (const patch of [{ fullName: "a" }, { fullName: "a".repeat(101) }, { location: "x".repeat(201) }, { note: "x".repeat(1001) }, { otherProductCategory: "x".repeat(201) }, { consultationType: "invalid" }, { productCategory: "invalid" }]) {
    assert.equal(consultationSchema.safeParse({ ...valid, ...patch }).success, false);
  }
});

test("diagnostic preview excludes all personal and free-text content", () => {
  const data = consultationSchema.parse({ ...valid, productCategory: "other", otherProductCategory: "Sensitive text" });
  const preview = JSON.stringify(sanitizedPreview(data));
  for (const secret of [data.fullName, data.phone, data.location, data.note!, data.otherProductCategory!]) assert.ok(!preview.includes(secret));
  assert.ok(preview.includes("[REDACTED]"));
});
