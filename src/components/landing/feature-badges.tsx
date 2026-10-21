import { Check } from "lucide-react";

export function FeatureBadges() {
  return <ul className="feature-badges" aria-label="Định hướng tư vấn">
    {["Tư vấn theo nhu cầu", "Hệ giải pháp đa dạng", "Kết nối khu vực"].map((label) => <li key={label}><Check size={14} aria-hidden="true" />{label}</li>)}
  </ul>;
}
