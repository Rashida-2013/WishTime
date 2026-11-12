import { Bold, Italic, Link2, List, ListOrdered, Quote, Underline } from "lucide-react";

export default function RichTextEditor({ value, onChange }) {
  return (
    <div className="editor">
      <div className="editor-toolbar" aria-label="Formatting toolbar">
        <button type="button"><Bold size={14} /></button>
        <button type="button"><Italic size={14} /></button>
        <button type="button"><Underline size={14} /></button>
        <span />
        <button type="button"><List size={14} /></button>
        <button type="button"><ListOrdered size={14} /></button>
        <button type="button"><Quote size={14} /></button>
        <button type="button"><Link2 size={14} /></button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Write a heartfelt message..."
        rows={6}
      />
    </div>
  );
}
