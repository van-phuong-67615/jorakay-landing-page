"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

export function Turnstile({ onToken, resetKey, verified }: { onToken: (token: string) => void; resetKey: number; verified: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!ready || !sitekey || !container.current || !window.turnstile) return;
    const api = window.turnstile;
    const id = api.render(container.current, {
      sitekey, action: "consultation", theme: "light", size: "compact", language: "vi",
      callback: (token: string) => { setLoadError(false); onToken(token); },
      "expired-callback": () => onToken(""),
      "error-callback": () => { onToken(""); setLoadError(true); },
    });
    return () => { api.remove(id); };
  }, [ready, sitekey, onToken, resetKey]);

  if (!sitekey) return <p className="field-error">Chức năng gửi yêu cầu đang được cấu hình. Bạn có thể liên hệ qua điện thoại hoặc email.</p>;
  return <div className="turnstile-field" hidden={verified}>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setLoadError(true)} />
    <div ref={container} />
    {loadError && <p className="field-error" role="alert">Không tải được xác minh. Vui lòng kiểm tra kết nối hoặc tải lại trang.</p>}
  </div>;
}
