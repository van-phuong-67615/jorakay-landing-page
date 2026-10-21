import { ConsultationForm } from "@/components/forms/consultation-form";
import { FeatureBadges } from "./feature-badges";
import { ProductShowcase } from "./product-showcase";

export function HeroSection() {
  return <div className="hero-card">
    <section className="hero-copy" aria-labelledby="hero-heading">
      <p className="eyebrow"><span aria-hidden="true" />TƯ VẤN TỪ ĐỘI NGŨ CHUYÊN MÔN</p>
      <h1 id="hero-heading">Giải pháp đúng<br className="desktop-break" /> cho <span>từng công trình</span></h1>
      <p className="hero-description">Để lại thông tin về khu vực và nhu cầu. Đội ngũ Jorakay sẽ liên hệ để tư vấn giải pháp, sản phẩm hoặc báo giá phù hợp với hiện trạng công trình.</p>
      <FeatureBadges />
      <ProductShowcase />
    </section>
    <ConsultationForm />
  </div>;
}
