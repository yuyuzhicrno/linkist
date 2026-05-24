import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Avatar } from '../ui/Avatar.jsx';

const NAV = [
  { to: '/', icon: '⌂', label: '首页' },
  { to: '/forum', icon: '◈', label: '讨论区' },
  { to: '/channels', icon: '#', label: '频道' },
  { to: '/columns', icon: '▤', label: '专栏' },
];

export function MobileNav({ onClose }) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <>
      <div className="fixed inset-0 z-50 flex lg:hidden">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-72 bg-[var(--surface-2)] border-r border-[var(--border)] h-full flex flex-col animate-slide-up">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">N</div>
              <span className="font-bold text-[var(--text-primary)]">Nexus</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] text-[var(--text-muted)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {user && (
            <div className="p-4 border-b border-[var(--border)]">
              <Link to={`/user/${user.username}`} onClick={onClose} className="flex items-center gap-3">
                <Avatar user={user} size="md" />
                <div>
                  <div className="font-semibold text-sm text-[var(--text-primary)]">{user.username}</div>
                  <div className="text-xs text-[var(--text-muted)]">{user.email}</div>
                </div>
              </Link>
            </div>
          )}

          <nav className="flex-1 p-4 space-y-1">
            {NAV.map(({ to, icon, label }) => {
              const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                    ${active ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}
                >
                  <span className="text-base w-5 text-center">{icon}</span>
                  {label}
                </Link>
              );
            })}
          </nav>

          {!user && (
            <div className="p-4 border-t border-[var(--border)] space-y-2">
              <Link to="/login" onClick={onClose} className="block w-full py-2.5 text-center text-sm font-medium border border-[var(--border)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors">
                登录
              </Link>
              <Link to="/register" onClick={onClose} className="block w-full py-2.5 text-center text-sm font-medium bg-[var(--accent)] text-white rounded-xl hover:brightness-110 transition-all">
                注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
