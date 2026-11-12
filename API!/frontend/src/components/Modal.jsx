import { X, Sparkles, Cake } from "lucide-react";
import Button from "./Button";

export default function Modal({ open, onClose, onUse, onRegenerate }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="wish-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={17} /></button>
        <h2>Confirm Your Scheduled Wish</h2>
        <div className="modal-grid">
          <div className="modal-summary">
            <div className="mini-event"><Cake size={20} /></div>
            <dl>
              <div><dt>Event</dt><dd>Birthday</dd></div>
              <div><dt>Recipient</dt><dd>Sarah Johnson</dd></div>
              <div><dt>Date</dt><dd>25 December 2026</dd></div>
              <div><dt>Time</dt><dd>09:00 AM</dd></div>
            </dl>
            <div className="preview-controls">
              <span>Message Preview</span>
              <label>Event Type<select><option>Birthday</option></select></label>
              <label>Recipient Name<input defaultValue="Sarah Johnson" /></label>
              <label>Tone<select><option>Friendly</option><option>Warm</option><option>Formal</option></select></label>
              <label>Message Length<select><option>Medium</option><option>Short</option><option>Long</option></select></label>
              <Button size="sm"><Sparkles size={14} /> Generate Message</Button>
            </div>
          </div>
          <div className="generated-panel">
            <span className="eyebrow">Generated Message</span>
            <h3>Happy Birthday, Sarah!</h3>
            <p>May your special day be filled with happiness, love and all the wonderful things you deserve. Here's to another amazing year ahead!</p>
            <Button onClick={onUse}>Use This Message</Button>
            <Button variant="outline" onClick={onRegenerate}>Regenerate</Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
