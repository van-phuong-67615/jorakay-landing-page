import Image from "next/image";
import { site } from "@/lib/constants/site";

export function Header() {
  return <header className="site-header container">
    <a href="#main" className="brand" aria-label="Jorakay Việt Nam — trang chủ">
      <Image className="brand-logo" src={site.officialLogoPath} width={9671} height={3287} sizes="(max-width: 559px) 160px, 210px" alt="JORAKAY" preload />
    </a>
    <Image className="header-logo-crocodile" src="/logo ca sau-01.png" width={3544} height={4849} sizes="(max-width: 559px) 32px, 44px" alt="Logo cá sấu đỏ Jorakay" preload />
  </header>;
}
