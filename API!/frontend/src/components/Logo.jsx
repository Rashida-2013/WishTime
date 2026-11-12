import { Heart } from "lucide-react";

export default function Logo({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand-mark"><Heart size={16} strokeWidth={3} fill="currentColor" /></span>
      <span className="brand-copy">
        <strong>WishTime</strong>
        {!compact && <small>Make Every Moment Memorable.</small>}
      </span>
    </div>
  );
}
