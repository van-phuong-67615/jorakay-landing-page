import Image from "next/image";
import Link from "next/link";
import { Globe, Mail, Phone } from "lucide-react";
import { site } from "@/lib/constants/site";

const socialBrands = [
  { label: "YouTube", className: "youtube", symbol: "▶" },
  { label: "Zalo", className: "zalo", symbol: "Zalo" },
  { label: "TikTok", className: "tiktok", symbol: "♪" },
  { label: "Facebook", className: "facebook", symbol: "f" },
];

export function Footer() {
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div className="company-details">
        <h2>{site.company}<br />{site.companyEnglish}</h2>
        <p>MST: {site.taxId}</p>
        <p><strong>Văn phòng Hồ Chí Minh:</strong> {site.hcmAddress}</p>
        <p><strong>Văn phòng Hà Nội:</strong> {site.hanoiAddress}</p>
        <div className="footer-contact">
          <h3>OFFICE</h3>
          <a href={site.officePhoneHref}><Phone size={14} aria-hidden="true" />{site.officePhone}</a>
          <a href={`mailto:${site.email}`}><Mail size={14} aria-hidden="true" />{site.email}</a>
          <a href={site.website}><Globe size={14} aria-hidden="true" />www.jorakay.vn</a>
        </div>
      </div>
      <div className="footer-social">
        <h2>THEO DÕI CHÚNG TÔI</h2>
        <div className="social-icons" aria-label="Mạng xã hội Jorakay">
          {socialBrands.map((brand) => {
            const url = site.socialLinks.find((link) => link.label === brand.label)?.url;
            const className = `social-icon social-${brand.className}`;
            return <Link key={brand.label} className={className} href={url || "#"} prefetch={false} aria-label={brand.label}>{brand.symbol}</Link>;
          })}
        </div>
        <Image className="footer-qr" src={site.footerQrImagePath} width={164} height={160} alt="Mã QR Jorakay từ ảnh mẫu" unoptimized />
      </div>
    </div>
    <div className="copyright">© {new Date().getFullYear()} Jorakay Việt Nam</div>
  </footer>;
}
