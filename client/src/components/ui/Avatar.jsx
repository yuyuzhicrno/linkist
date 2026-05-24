import { getAvatar } from '../../utils/helpers.js';

export function Avatar({ user, size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
  const sizeClass = sizes[size] || sizes.md;
  const av = getAvatar(user);

  if (!av) return (
    <div className={`${sizeClass} rounded-full bg-[var(--surface-3)] flex items-center justify-center ${className}`}>
      <span className="text-[var(--text-muted)]">?</span>
    </div>
  );

  if (typeof av === 'string') return (
    <img src={av} alt={user?.username} className={`${sizeClass} rounded-full object-cover ${className}`} />
  );

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white select-none ${className}`}
      style={{ background: av.color }}
    >
      {av.initials}
    </div>
  );
}
