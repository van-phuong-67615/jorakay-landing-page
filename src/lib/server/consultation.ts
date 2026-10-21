import { createHmac } from "node:crypto";
import { z } from "zod";
import { consultationSchema } from "../validations/consultation.schema.ts";

const configSchema = z.object({
  APP_URL: z.url(),
  GOOGLE_APPS_SCRIPT_URL: z.url().refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "script.google.com"
        && /^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname)
        && !url.username && !url.password && !url.search && !url.hash;
    } catch { return false; }
  }),
  GOOGLE_APPS_SCRIPT_SECRET: z.string().min(32),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  PRIVACY_POLICY_VERSION: z.string().trim().min(1).max(100),
});

const requestSchema = z.object({
  data: consultationSchema,
  submissionId: z.uuid(),
  turnstileToken: z.string().min(1).max(2048),
  website: z.literal(""), // Honeypot, never forwarded to Google.
});

const receiptSchema = z.object({
  ok: z.literal(true),
  requestId: z.uuid(),
  status: z.enum(["saved", "duplicate"]),
});

function reply(status: number, message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: status < 400, message, ...extra }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

async function readJson(request: Request) {
  const limit = 16_384;
  if (Number(request.headers.get("content-length")) > limit) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new RangeError(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

// Dependency injection permits network-free tests of the real request handler.
export async function handleConsultation(
  request: Request,
  environment: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
) {
  const config = configSchema.safeParse(environment);
  if (!config.success) return reply(503, "Chức năng gửi yêu cầu chưa sẵn sàng. Vui lòng liên hệ qua số điện thoại hoặc email bên cạnh.");
  const env = config.data;
  const origin = new URL(env.APP_URL).origin;
  if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return reply(403, "Yêu cầu không hợp lệ. Vui lòng tải lại trang.");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return reply(415, "Định dạng yêu cầu không hợp lệ.");
  }
  let body: unknown;
  try { body = await readJson(request); }
  catch (error) { return reply(error instanceof RangeError ? 413 : 400, "Dữ liệu yêu cầu không hợp lệ."); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return reply(400, "Vui lòng kiểm tra thông tin và hoàn tất xác minh trước khi gửi.");
  const { data, submissionId, turnstileToken } = parsed.data;

  try {
    const verificationResponse = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!verificationResponse.ok) return reply(503, "Không thể xác minh lúc này. Vui lòng thử lại.");
    const verification: unknown = await verificationResponse.json();
    const verified = z.object({ success: z.literal(true), hostname: z.string(), action: z.literal("consultation") }).safeParse(verification);
    if (!verified.success || verified.data.hostname !== new URL(origin).hostname) {
      return reply(400, "Xác minh đã hết hạn hoặc không hợp lệ. Vui lòng xác minh lại.");
    }

    const phone = data.phone.replace(/^\+84/, "0");
    const lead = {
      ...data, phone,
      otherProductCategory: data.productCategory === "other" ? data.otherProductCategory : "",
      note: data.note ?? "",
    };
    const payload = JSON.stringify({
      requestId: submissionId,
      data: lead,
      consentVersion: env.PRIVACY_POLICY_VERSION,
      rateKey: createHmac("sha256", env.GOOGLE_APPS_SCRIPT_SECRET).update(phone).digest("hex"),
    });
    const timestamp = Date.now();
    const signature = createHmac("sha256", env.GOOGLE_APPS_SCRIPT_SECRET).update(`${timestamp}.${payload}`).digest("hex");
    const upstream = await fetcher(env.GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp, payload, signature }),
      signal: AbortSignal.timeout(15_000),
      redirect: "follow", // Google ContentService responds through a one-time redirect.
      cache: "no-store",
    });
    if (!upstream.ok) return reply(502, "Chưa xác nhận được yêu cầu. Vui lòng thử lại để kiểm tra trạng thái.");
    const result: unknown = await upstream.json();
    const receipt = receiptSchema.safeParse(result);
    if (receipt.success && receipt.data.requestId === submissionId) {
      return reply(200, "Gửi yêu cầu thành công. Jorakay sẽ liên hệ tư vấn cho bạn.", { requestId: submissionId });
    }
    const failure = z.object({ ok: z.literal(false), code: z.string() }).safeParse(result);
    if (failure.success && failure.data.code === "RATE_LIMITED") {
      return reply(429, "Bạn đã gửi nhiều yêu cầu. Vui lòng đợi khoảng 10 phút hoặc liên hệ trực tiếp.");
    }
    if (failure.success && failure.data.code === "IDEMPOTENCY_CONFLICT") {
      return reply(409, "Mã yêu cầu đã được sử dụng. Vui lòng tải lại trang trước khi gửi thông tin mới.");
    }
    return reply(502, "Chưa xác nhận được yêu cầu. Vui lòng thử lại để kiểm tra trạng thái.");
  } catch {
    // An upstream timeout can occur after a row is saved. Never claim failure/success
    // definitively; the client keeps its request ID to deduplicate a retry.
    return reply(504, "Kết nối bị gián đoạn, chưa xác nhận được kết quả. Vui lòng thử lại; hệ thống sẽ kiểm tra để tránh gửi trùng.");
  }
}
