import { Award, Cake, HandHeart, Heart, PartyPopper, Sparkles, Star } from "lucide-react";

const map = { cake: Cake, heart: Heart, sparkles: Sparkles, award: Award, hand: HandHeart, star: Star, party: PartyPopper };

export default function EventIcon({ type = "cake", size = 20 }) {
  const Icon = map[type] || Cake;
  return <Icon size={size} />;
}
