import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { ContactRail } from "@/components/layout/contact-rail";

export default function Home() {
  return <><Header /><main id="main" className="container main-content"><HeroSection /></main><Footer /><ContactRail /></>;
}
