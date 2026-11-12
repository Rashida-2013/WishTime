import { Bell, CalendarDays, Clock3, Gift, Heart, MessageSquare, Sparkles } from "lucide-react";

export default function WishArtwork({ small = false }) {
  return (
    <div className={`wish-artwork ${small ? "small" : ""}`} aria-hidden="true">
      <div className="art-glow" />
      <div className="art-calendar">
        <div className="calendar-top" />
        <div className="calendar-rings"><i /><i /><i /></div>
        <div className="calendar-grid">
          {Array.from({ length: 21 }).map((_, i) => <span key={i}>{(i % 9) + 1}</span>)}
        </div>
        <div className="clock"><Clock3 size={38} /><b /></div>
      </div>
      <div className="art-gift"><div className="gift-ribbon" /><Gift size={70} /></div>
      <div className="art-card">Best<br />Wishes</div>
      <div className="art-leaf leaf-1" /><div className="art-leaf leaf-2" /><div className="art-leaf leaf-3" />
      <div className="art-heart"><Heart size={20} fill="currentColor" /></div>
      <div className="art-bell"><Bell size={20} /></div>
      <div className="art-message"><MessageSquare size={22} /></div>
      <Sparkles className="art-sparkle" size={24} />
    </div>
  );
}
