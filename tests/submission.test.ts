import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import test from "node:test";
import { handleConsultation } from "../src/lib/server/consultation.ts";

const env = {
  APP_URL: "https://jorakay.example",
  GOOGLE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/test-deployment/exec",
  GOOGLE_APPS_SCRIPT_SECRET: "test-only-secret-with-at-least-32-characters",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-sitekey",
  TURNSTILE_SECRET_KEY: "test-secret",
  PRIVACY_POLICY_VERSION: "2026-10-20",
};
const valid = {
  fullName: "Nguyễn Kiểm Thử", phone: "+84 91 234 5678", location: "Quảng Ninh, Hạ Long",
  consultationType: "solution", productCategory: "grout", note: "Kiểm tra", privacyConsent: true,
};
function request(overrides: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new Request(`${env.APP_URL}/api/consultation`, {
    method: "POST", headers: { Origin: env.APP_URL, "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ data: valid, submissionId: randomUUID(), turnstileToken: "test-token", website: "", ...overrides }),
  });
}
function mockFetch(responses: unknown[], calls: { url: string; init?: RequestInit }[] = []): typeof fetch {
  return (async (url, init) => {
    calls.push({ url: String(url), init });
    const result = responses.shift();
    if (result instanceof Error) throw result;
    return Response.json(result);
  }) as typeof fetch;
}
const verification = { success: true, hostname: "jorakay.example", action: "consultation" };

test("unconfigured integration fails closed without external requests", async () => {
  let called = false;
  const response = await handleConsultation(request(), {}, (async () => { called = true; throw new Error(); }) as typeof fetch);
  assert.equal(response.status, 503);
  assert.equal(called, false);
});

test("rejects foreign origin, wrong content type, invalid fields, honeypot and oversize input before network", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = mockFetch([], calls);
  assert.equal((await handleConsultation(request({}, { Origin: "https://attacker.example" }), env, fetcher)).status, 403);
  assert.equal((await handleConsultation(request({}, { "Content-Type": "text/plain" }), env, fetcher)).status, 415);
  assert.equal((await handleConsultation(request({ data: { ...valid, privacyConsent: false } }), env, fetcher)).status, 400);
  assert.equal((await handleConsultation(request({ data: { ...valid, location: "Hạ Long" } }), env, fetcher)).status, 400);
  assert.equal((await handleConsultation(request({ data: { ...valid, location: "Quảng Ninh," } }), env, fetcher)).status, 400);
  assert.equal((await handleConsultation(request({ website: "spam.example" }), env, fetcher)).status, 400);
  assert.equal((await handleConsultation(request({}, { "Content-Length": "20000" }), env, fetcher)).status, 413);
  assert.equal((await handleConsultation(request({ website: "x".repeat(17000) }), env, fetcher)).status, 413);
  assert.equal(calls.length, 0);
});

test("accepts only a configured Google /exec endpoint", async () => {
  for (const url of ["", "not-a-url", "https://attacker.example/exec", "http://script.google.com/macros/s/test/exec", "https://script.google.com/macros/s/test/dev"]) {
    assert.equal((await handleConsultation(request(), { ...env, GOOGLE_APPS_SCRIPT_URL: url }, mockFetch([]))).status, 503);
  }
});

test("requires successful bot verification for expected hostname and action", async () => {
  for (const result of [{ success: false }, { ...verification, hostname: "other.example" }, { ...verification, action: "other" }]) {
    const calls: { url: string; init?: RequestInit }[] = [];
    assert.equal((await handleConsultation(request(), env, mockFetch([result], calls))).status, 400);
    assert.equal(calls.length, 1);
  }
});

test("signs normalized lead and confirms only a matching save receipt", async () => {
  const id = randomUUID();
  const calls: { url: string; init?: RequestInit }[] = [];
  const response = await handleConsultation(request({ submissionId: id }), env, mockFetch([verification, { ok: true, status: "saved", requestId: id }], calls));
  assert.equal(response.status, 200);
  const envelope = JSON.parse(String(calls[1].init?.body));
  assert.equal(envelope.signature, createHmac("sha256", env.GOOGLE_APPS_SCRIPT_SECRET).update(`${envelope.timestamp}.${envelope.payload}`).digest("hex"));
  const payload = JSON.parse(envelope.payload);
  assert.equal(payload.data.phone, "0912345678");
  assert.equal(payload.requestId, id);
  assert.equal(payload.consentVersion, env.PRIVACY_POLICY_VERSION);
  assert.ok(!envelope.payload.includes("test-token"));
  assert.ok(!JSON.stringify(await response.json()).includes(valid.fullName));
});

test("accepts duplicate receipt but rejects false or mismatched upstream success", async () => {
  const id = randomUUID();
  assert.equal((await handleConsultation(request({ submissionId: id }), env, mockFetch([verification, { ok: true, status: "duplicate", requestId: id }]))).status, 200);
  for (const result of [{ ok: true }, { ok: true, status: "saved", requestId: randomUUID() }, { ok: false, code: "INTERNAL_ERROR" }]) {
    assert.equal((await handleConsultation(request({ submissionId: id }), env, mockFetch([verification, result]))).status, 502);
  }
});

test("returns explicit rate limit and ambiguous timeout without leaking errors", async () => {
  assert.equal((await handleConsultation(request(), env, mockFetch([verification, { ok: false, code: "RATE_LIMITED" }]))).status, 429);
  const response = await handleConsultation(request(), env, mockFetch([verification, new Error("private-upstream-detail")]));
  assert.equal(response.status, 504);
  assert.ok(!(await response.text()).includes("private-upstream-detail"));
});
