"use client";

import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, ArrowUpRight, CheckCircle2, LoaderCircle, LockKeyhole, MapPin } from "lucide-react";
import { consultationSchema } from "@/lib/validations/consultation.schema";
import { consultationTypes, productCategories } from "@/lib/constants/consultation";
import { site } from "@/lib/constants/site";
import type { ConsultationInput, ConsultationData } from "@/types/consultation";
import { FieldError, FormField } from "./form-field";
import { Turnstile } from "./turnstile";

export function ConsultationForm() {
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"success" | "error">("error");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const pending = useRef<{ id: string; fingerprint: string } | null>(null);
  const sending = useRef(false);
  const { register, handleSubmit, control, unregister, reset, trigger, formState: { errors, isSubmitting } } = useForm<ConsultationInput, unknown, ConsultationData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: { fullName: "", phone: "", location: "", note: "", privacyConsent: false },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldUnregister: true,
  });
  const category = useWatch({ control, name: "productCategory" });
  const productRegistration = register("productCategory");
  async function onValid(data: ConsultationData) {
    if (sending.current) return;
    setStatusKind("error");
    setStatus("");
    if (!turnstileToken) { setStatus("Vui lòng hoàn tất xác minh trước khi gửi yêu cầu."); return; }
    sending.current = true;
    const fingerprint = JSON.stringify(data);
    if (!pending.current || pending.current.fingerprint !== fingerprint) {
      pending.current = { id: crypto.randomUUID(), fingerprint };
    }
    try {
      const response = await fetch("/api/consultation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, submissionId: pending.current.id, turnstileToken, website: honeypot.current?.value ?? "" }),
        signal: AbortSignal.timeout(28_000),
      });
      const result: unknown = await response.json();
      const value = result as { ok?: boolean; requestId?: string; message?: string };
      if (response.ok && value.ok === true && value.requestId === pending.current.id) {
        setStatusKind("success");
        setStatus("Gửi yêu cầu thành công. Jorakay sẽ liên hệ tư vấn cho bạn.");
        pending.current = null;
        reset();
      } else {
        setStatus(typeof value.message === "string" ? value.message : "Chưa xác nhận được kết quả. Vui lòng thử lại.");
      }
    } catch {
      setStatus("Kết nối bị gián đoạn, chưa xác nhận được kết quả. Vui lòng thử lại; hệ thống sẽ kiểm tra để tránh gửi trùng.");
    } finally {
      sending.current = false;
      setTurnstileToken("");
      setCaptchaReset((value) => value + 1);
    }
  }
  const a11y = (name: keyof ConsultationInput) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return <section className="consultation-card" aria-labelledby="form-heading" id="tu-van">
    <div className="form-intro">
      <h2 id="form-heading">Đăng ký tư vấn &amp; báo giá</h2>
      <p>Vui lòng điền thông tin để Jorakay hỗ trợ chi tiết.</p>
    </div>
    <form noValidate aria-busy={isSubmitting} onSubmit={(event) => { void handleSubmit(onValid, () => setStatus(""))(event); }} onChange={() => { if (status) setStatus(""); }}>
      <div className="form-honeypot" aria-hidden="true">
        <label htmlFor="company-website">Website</label>
        <input disabled={isSubmitting} id="company-website" name="website" ref={honeypot} tabIndex={-1} autoComplete="off" />
      </div>
      <div className="form-row">
        <FormField id="fullName" label="Họ và Tên" required error={errors.fullName?.message}>
          <input disabled={isSubmitting} id="fullName" autoComplete="name" placeholder="Nguyễn Văn A" aria-required="true" {...register("fullName")} {...a11y("fullName")} />
        </FormField>
        <FormField id="phone" label="Số Điện Thoại" required error={errors.phone?.message}>
          <input disabled={isSubmitting} id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="09xx xxx xxx" aria-required="true" {...register("phone")} {...a11y("phone")} />
        </FormField>
      </div>
      <FormField id="location" label="Khu vực (Tỉnh/Thành phố, Quận/Huyện)" required error={errors.location?.message}>
        <input disabled={isSubmitting} id="location" autoComplete="off" placeholder="Ví dụ: Quảng Ninh, Hạ Long" aria-required="true" {...register("location", { onBlur: () => { void trigger("location"); } })} {...a11y("location")} aria-describedby={`location-hint${errors.location ? " location-error" : ""}`} />
        <p className="field-hint" id="location-hint">Nhập Tỉnh/Thành phố trước, Quận/Huyện sau, ngăn cách bằng dấu phẩy.</p>
      </FormField>
      <fieldset className="needs-fieldset" aria-describedby={errors.consultationType ? "consultationType-error" : undefined}>
        <legend>Nhu cầu<span className="required" aria-hidden="true"> *</span></legend>
        <div className="radio-options">
          {consultationTypes.map((option) => <label className="radio-option" key={option.value}>
            <input disabled={isSubmitting} type="radio" value={option.value} required {...register("consultationType")} {...a11y("consultationType")} />
            <span>{option.label}</span>
          </label>)}
        </div>
        <FieldError id="consultationType-error" message={errors.consultationType?.message} />
      </fieldset>
      <FormField id="productCategory" label="Hệ sản phẩm cần tư vấn" required error={errors.productCategory?.message}>
        <select disabled={isSubmitting} id="productCategory" defaultValue="" aria-required="true" {...productRegistration} {...a11y("productCategory")} onChange={(event) => {
          if (event.target.value !== "other") unregister("otherProductCategory");
          void productRegistration.onChange(event);
        }}>
          <option value="" disabled>Chọn hệ sản phẩm</option>
          {productCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </FormField>
      {category === "other" && <FormField id="otherProductCategory" label="Vui lòng mô tả hệ sản phẩm" required error={errors.otherProductCategory?.message}>
        <input disabled={isSubmitting} id="otherProductCategory" placeholder="Nhập hệ sản phẩm bạn quan tâm" aria-required="true" {...register("otherProductCategory")} {...a11y("otherProductCategory")} />
      </FormField>}
      <FormField id="note" label="Ghi chú thêm" error={errors.note?.message}>
        <textarea disabled={isSubmitting} id="note" rows={3} placeholder="Mô tả hiện trạng công trình hoặc thời gian thuận tiện để liên hệ..." {...register("note")} {...a11y("note")} />
      </FormField>
      <div className="consent-field">
        <label className="consent-label" htmlFor="privacyConsent">
          <input disabled={isSubmitting} id="privacyConsent" type="checkbox" aria-required="true" {...register("privacyConsent")} {...a11y("privacyConsent")} />
          <span>Tôi đồng ý để Jorakay sử dụng thông tin trên nhằm liên hệ tư vấn và hỗ trợ theo nhu cầu đã đăng ký.<span className="required" aria-hidden="true"> *</span></span>
        </label>
        {site.privacyPolicyUrl && <a className="policy-link" href={site.privacyPolicyUrl}>Chính sách bảo mật</a>}
        <FieldError id="privacyConsent-error" message={errors.privacyConsent?.message} />
      </div>
      <Turnstile onToken={setTurnstileToken} resetKey={captchaReset} verified={!!turnstileToken} />
      <button type="submit" className="submit-button" disabled={isSubmitting || !turnstileToken}>
        {isSubmitting ? <>ĐANG GỬI YÊU CẦU <LoaderCircle className="loading-icon" size={18} aria-hidden="true" /></> : <>GỬI YÊU CẦU TƯ VẤN <ArrowRight size={18} aria-hidden="true" /></>}
      </button>
      <p className="demo-note"><LockKeyhole size={12} aria-hidden="true" /> Thông tin được sử dụng để liên hệ tư vấn theo nhu cầu của bạn.</p>
      <div role="status" aria-live="polite" aria-atomic="true">{status && <p className={`validation-status${statusKind === "error" ? " submission-error" : ""}`}>{statusKind === "success" ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertCircle size={20} aria-hidden="true" />}<span>{status}</span></p>}</div>
    </form>
    <a className="store-locator-link" href={site.storeLocatorUrl} target="_blank" rel="noopener noreferrer" aria-label="Tìm cửa hàng gần tôi (mở trong tab mới)">
      <MapPin size={19} aria-hidden="true" />
      <span>Tìm cửa hàng gần tôi</span>
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  </section>;
}
