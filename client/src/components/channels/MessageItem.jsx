import { useState } from 'react';
import { Avatar } from '../ui/Avatar.jsx';
import { timeAgo } from '../../utils/helpers.js';

export function MessageItem({ msg, grouped, onReact, quickReactions, currentUser }) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div
      className={`group flex gap-3 px-2 py-1 rounded-xl hover:bg-[var(--surface-2)] transition-colors relative ${grouped ? '' : 'mt-3'}`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {!grouped ? (
        <Avatar user={msg.author} size="sm" className="flex-shrink-0 mt-0.5" />
      ) : (
        <div className="w-8 flex-shrink-0 flex items-center justify-end">
          {showReactions && <span className="text-xs text-[var(--text-muted)]">{new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-sm text-[var(--text-primary)]">{msg.author?.username}</span>
            <span className="text-xs text-[var(--text-muted)]">{timeAgo(msg.createdAt)}</span>
          </div>
        )}
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed break-words">{msg.content}</p>
        {Object.entries(msg.reactions || {}).some(([, users]) => users.length > 0) && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {Object.entries(msg.reactions).map(([emoji, users]) => users.length > 0 && (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all
                  ${currentUser && users.includes(currentUser.id)
                    ? 'bg-[var(--accent)]/20 border-[var(--accent)]/30 text-[var(--accent)]'
                    : 'bg-[var(--surface-3)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                  }`}
              >
                {emoji} {users.length}
              </button>
            ))}
          </div>
        )}
      </div>
      {showReactions && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
          {quickReactions.map(e => (
            <button key={e} onClick={() => onReact(msg.id, e)} className="hover:scale-125 transition-transform text-sm">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}