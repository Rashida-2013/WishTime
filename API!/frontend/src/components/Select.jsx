import { ChevronDown } from "lucide-react";

export default function Select({ label, options = [], ...props }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <span className="select-wrap">
        <select {...props}>
          {options.map((option) => (
            <option key={option.value ?? option} value={option.value ?? option}>
              {option.label ?? option}
            </option>
          ))}
        </select>
        <ChevronDown size={14} />
      </span>
    </label>
  );
}
