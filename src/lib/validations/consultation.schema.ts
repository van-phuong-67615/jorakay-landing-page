import { z } from "zod";
import { consultationTypes, productCategories } from "../constants/consultation.ts";

export const consultationSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên hợp lệ.").max(100, "Vui lòng nhập họ và tên hợp lệ."),
  phone: z.string().transform((value) => value.replace(/\s/g, "")).pipe(
    z.string().regex(/^(?:0|\+84)[35789]\d{8}$/, "Vui lòng nhập số điện thoại hợp lệ."),
  ),
  location: z.string().trim()
    .min(1, "Vui lòng nhập Tỉnh/Thành phố, Quận/Huyện.")
    .max(200, "Khu vực không được vượt quá 200 ký tự.")
    .refine((value) => {
      const parts = value.split(",");
      return parts.length === 2 && parts.every((part) => part.trim().length > 0 && !/[\r\n]/.test(part));
    }, "Vui lòng nhập đủ Tỉnh/Thành phố, Quận/Huyện, ngăn cách bằng đúng một dấu phẩy.")
    .transform((value) => value.split(",").map((part) => part.trim()).join(", "))
    .pipe(z.string().max(200, "Khu vực không được vượt quá 200 ký tự.")),
  consultationType: z.enum(consultationTypes.map((option) => option.value), { error: "Vui lòng chọn nhu cầu tư vấn." }),
  productCategory: z.enum(productCategories.map((option) => option.value), { error: "Vui lòng chọn hệ sản phẩm cần tư vấn." }),
  otherProductCategory: z.string().trim().max(200, "Vui lòng mô tả trong tối đa 200 ký tự.").optional(),
  note: z.string().trim().max(1000, "Ghi chú không được vượt quá 1000 ký tự.").optional(),
  privacyConsent: z.boolean().refine((value) => value, "Bạn cần đồng ý với chính sách bảo mật."),
}).superRefine((data, context) => {
  if (data.productCategory === "other" && !data.otherProductCategory) {
    context.addIssue({ code: "custom", path: ["otherProductCategory"], message: "Vui lòng mô tả hệ sản phẩm cần tư vấn." });
  }
});

// Keep personal content out of diagnostics, including free-text fields.
export function sanitizedPreview(data: z.output<typeof consultationSchema>) {
  return {
    fullName: "[REDACTED]",
    phone: "[REDACTED]",
    location: "[REDACTED]",
    consultationType: data.consultationType,
    productCategory: data.productCategory,
    otherProductCategory: data.otherProductCategory ? "[REDACTED]" : undefined,
    note: data.note ? "[REDACTED]" : undefined,
    privacyConsent: data.privacyConsent,
  };
}
