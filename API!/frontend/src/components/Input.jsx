export default function Input({ label, icon: Icon, error, ...props }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <span className="input-wrap">
        {Icon && <Icon size={15} className="input-icon" />}
        <input {...props} />
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
