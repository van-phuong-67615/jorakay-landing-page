import { Mail, Phone } from "lucide-react";
import { site } from "@/lib/constants/site";

export function ContactRail() {
  const zaloUrl = site.socialLinks.find((link) => link.label === "Zalo")?.url
    || `https://zalo.me/${site.officePhoneHref.replace(/^tel:/, "")}`;

  return <nav className="contact-rail" aria-label="Liên hệ nhanh">
    <a className="contact-rail-button" href={site.officePhoneHref} aria-label={`Gọi ${site.officePhone}`} title={`Gọi ${site.officePhone}`}>
      <Phone size={19} aria-hidden="true" />
    </a>
    <a className="contact-rail-button" href={`mailto:${site.email}`} aria-label={`Gửi email đến ${site.email}`} title={site.email}>
      <Mail size={19} aria-hidden="true" />
    </a>
    <a className="contact-rail-button contact-rail-zalo" href={zaloUrl} target="_blank" rel="noopener noreferrer" aria-label="Liên hệ qua Zalo (mở trong tab mới)" title="Liên hệ qua Zalo">
      Zalo
    </a>
  </nav>;
}
