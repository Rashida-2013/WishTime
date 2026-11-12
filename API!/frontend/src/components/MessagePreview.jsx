import { Cake, Heart, PartyPopper } from "lucide-react";

export default function MessagePreview({ recipient = "Sarah" }) {
  return (
    <div className="wish-card">
      <div className="wish-balloon balloon-a" />
      <div className="wish-balloon balloon-b" />
      <div className="wish-balloon balloon-c" />
      <div className="wish-sparkle s1">✦</div>
      <div className="wish-sparkle s2">✦</div>
      <div className="cake-illustration">
        <span className="candle c1" /><span className="candle c2" /><span className="candle c3" />
        <div className="cake-top"><Cake size={30} /></div>
      </div>
      <div className="wish-title">Happy Birthday,<br />{recipient}!</div>
      <p>Wishing you a wonderful birthday filled with happiness, success, and unforgettable memories.</p>
      <div className="wish-footer"><Heart size={13} fill="currentColor" /> Have an amazing day! <PartyPopper size={13} /></div>
    </div>
  );
}
