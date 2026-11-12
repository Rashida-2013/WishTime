import { Link } from "react-router-dom";
import { ArrowRight, Award, Cake, CalendarDays, CheckCircle2, Clock3, Gift, HandHeart, MessageSquare, PartyPopper, Sparkles, Star } from "lucide-react";
import Header from "../components/Header";
import Button from "../components/Button";
import WishArtwork from "../components/WishArtwork";
import EventIcon from "../components/EventIcon";
import { categories } from "../data/events";

const categoryIcons = { cake: Cake, party: PartyPopper, sparkles: Sparkles, award: Award, hand: HandHeart, star: Star };

export default function Home() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <section className="hero page-container">
          <div className="hero-copy">
            <span className="eyebrow">Thoughtful wishes, perfectly timed</span>
            <h1>Send the Right Wish<br />at the Right Time.</h1>
            <p>Create beautiful personalized wishes and schedule them for the moments that matter most.</p>
            <div className="hero-actions">
              <Link to="/create-event"><Button>Create an Event <ArrowRight size={15} /></Button></Link>
              <Link to="/events"><Button variant="outline">Explore Events</Button></Link>
            </div>
          </div>
          <div className="hero-art"><WishArtwork /></div>
        </section>

        <section className="page-container home-section">
          <div className="section-heading"><h2>Create a Wish for Every Special Moment</h2></div>
          <div className="category-grid">
            {categories.map((item) => {
              const Icon = categoryIcons[item.icon];
              return (
                <Link to="/create-event" className="category-card" key={item.title}>
                  <span className={`category-icon ${item.tone}`}><Icon size={21} /></span>
                  <span><strong>{item.title}</strong><small>{item.description}</small></span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="page-container home-section">
          <div className="section-heading"><h2>How It Works</h2><p>Four simple steps to make every special moment memorable.</p></div>
          <div className="steps">
            {[
              ["01", "Choose Event", "Select the type of occasion.", CalendarDays],
              ["02", "Create Your Message", "Write or generate a personalized wish.", MessageSquare],
              ["03", "Schedule", "Choose the exact date and time.", Clock3],
              ["04", "Celebrate", "WishTime delivers the message at the scheduled time.", Gift],
            ].map(([num, title, text, Icon], i) => (
              <div className="step-card" key={title}>
                <div className="step-icon"><Icon size={18} /></div>
                <span className="step-num">{num}</span>
                <strong>{title}</strong>
                <p>{text}</p>
                {i < 3 && <ArrowRight className="step-arrow" size={17} />}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
