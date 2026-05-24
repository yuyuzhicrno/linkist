export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };
  const variants = {
    primary: 'bg-[var(--accent)] text-white hover:brightness-110 active:scale-[0.98]',
    secondary: 'bg-[var(--surface-3)] text-[var(--text-primary)] hover:bg-[var(--border)] active:scale-[0.98]',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] active:scale-[0.98]',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-[0.98]',
    outline: 'border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] active:scale-[0.98]',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
