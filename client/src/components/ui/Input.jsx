export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
      <input
        className={`w-full px-4 py-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] 
          text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm
          focus:border-[var(--accent)] transition-colors ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
      <textarea
        className={`w-full px-4 py-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] 
          text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm resize-none
          focus:border-[var(--accent)] transition-colors ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
