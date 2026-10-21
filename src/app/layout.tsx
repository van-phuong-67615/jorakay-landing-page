import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "JORAKAY Việt Nam — Tư vấn & Báo giá",
  description: "Tìm giải pháp phù hợp cho từng công trình. Đăng ký tư vấn keo dán gạch, keo chà ron, chống thấm và sửa chữa cùng Jorakay Việt Nam.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={inter.variable}><body><a className="skip-link" href="#main">Chuyển đến nội dung chính</a>{children}</body></html>;
}
