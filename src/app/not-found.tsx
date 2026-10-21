import Link from "next/link";

export default function NotFound() {
  return <main id="main" className="container not-found"><p className="eyebrow">JORAKAY VIETNAM</p><h1>Không tìm thấy trang</h1><p>Trang bạn tìm kiếm hiện không có sẵn.</p><Link href="/">Trở về trang tư vấn →</Link></main>;
}
