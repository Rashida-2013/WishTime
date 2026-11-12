export default function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle ${checked ? "is-on" : ""}`}
        onClick={() => onChange?.(!checked)}
      >
        <span />
      </button>
    </label>
  );
}
