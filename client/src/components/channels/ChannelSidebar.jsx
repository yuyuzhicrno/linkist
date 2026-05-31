import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api.js';
import { Button } from '../ui/Button.jsx';

const ICONS = ['💬', '🦀', '🎵', '🎮', '📚', '🎨', '🔥', '🌟', '🚀', '💡', '🛠', '🌍'];
const COLORS = ['#7c3aed', '#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#f97316'];

export function ChannelSidebar({ channels, loading, user, activeId, onSelect, onCreated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', icon: '💬', color: '#7c3aed', isPublic: true });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const createChannel = async () => {
    if (!newChannel.name.trim()) return;
    setCreating(true);
    setError(null);
    const data = await api.post('/channels', newChannel);
    if (!data.error) {
      onCreated({ ...data, messageCount: 0, lastMessage: null });
      setShowCreate(false);
      onSelect(data.id);
    } else {
      setError(data.error);
    }
    setCreating(false);
  };

  return (
    <>
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-[var(--text-primary)]">频道</h2>
          <p className="text-xs text-[var(--text-muted)]">{channels.length} 个频道</p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-7 h-7 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)]/30 transition-colors text-lg font-bold"
          >
            +
          </button>
        )}
      </div>

      {error && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-500/20 text-red-500 text-xs rounded-lg">
          {error}
        </div>
      )}

      {showCreate && user && (
        <div className="p-3 border-b border-[var(--border)] bg-[var(--channel-bg)]">
          <input
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] mb-2 focus:border-[var(--accent)] transition-colors"
            placeholder="频道名称"
            value={newChannel.name}
            onChange={e => setNewChannel(n => ({ ...n, name: e.target.value }))}
          />
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {ICONS.map(icon => (
              <button key={icon} onClick={() => setNewChannel(n => ({ ...n, icon }))}
                className={`w-7 h-7 rounded-md text-sm flex items-center justify-center transition-colors ${newChannel.icon === icon ? 'bg-[var(--accent)]/30 ring-1 ring-[var(--accent)]' : 'hover:bg-[var(--surface-3)]'}`}>
                {icon}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 mb-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewChannel(n => ({ ...n, color: c }))}
                style={{ background: c }}
                className={`w-5 h-5 rounded-full transition-transform ${newChannel.color === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`} />
            ))}
          </div>
          <Button size="sm" onClick={createChannel} disabled={creating} className="w-full">
            {creating ? '创建中...' : '创建'}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading ? (
          <div className="p-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>
        ) : channels.map(ch => (
          <button
            key={ch.id}
            onClick={() => onSelect(ch.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left group
              ${activeId === ch.id ? 'bg-[var(--accent)]/20 text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-secondary)]'}`}
          >
            <span className="channel-icon text-base w-6 text-center">{ch.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{ch.name}</div>
              {ch.lastMessage && (
                <div className="text-xs truncate opacity-60">{ch.lastMessage.content?.slice(0, 25)}...</div>
              )}
            </div>
            {ch.messageCount > 0 && (
              <span className="text-xs bg-[var(--surface-3)] rounded-full px-1.5 py-0.5 flex-shrink-0">
                {ch.messageCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}