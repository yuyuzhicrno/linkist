export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl 
        ${hover ? 'hover:border-[var(--accent)]/30 hover:bg-[var(--surface-3)] transition-all duration-200 cursor-pointer' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function Badge({ children, color, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}
      style={color ? { background: `${color}20`, color } : {}}
    >
      {children}
    </span>
  );
}

export function Divider({ className = '' }) {
  return <hr className={`border-[var(--border)] ${className}`} />;
}
