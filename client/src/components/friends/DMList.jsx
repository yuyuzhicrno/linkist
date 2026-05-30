import { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { Avatar } from '../ui/Avatar.jsx';

export function DMList({ onSelect }) {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    api.getDMList().then(data => { if (Array.isArray(data)) setConversations(data); });
  }, []);

  if (conversations.length === 0) return (
    <div className="p-4 text-center text-[var(--text-muted)] text-sm">没有私信记录</div>
  );

  return (
    <div className="p-2 space-y-1">
      {conversations.map(c => (
        <button key={c.id} onClick={() => onSelect(c.other)}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-all text-left">
          <Avatar user={c.other} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--text-primary)] text-sm">{c.other?.username}</span>
              {c.unread > 0 && (
                <span className="text-xs bg-[var(--accent)] text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {c.unread}
                </span>
              )}
            </div>
            {c.lastMessage && (
              <p className="text-xs text-[var(--text-muted)] truncate">{c.lastMessage.content}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}