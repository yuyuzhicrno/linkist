import { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';

export function ChannelMembers({ channel, user }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    loadMembers();
  }, [channel.id]);

  const loadMembers = async () => {
    setLoading(true);
    const data = await api.get(`/channels/${channel.id}/members`);
    if (!data.error) {
      setMembers(data);
    }
    setLoading(false);
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const data = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
    if (!data.error) {
      const existingIds = members.map(m => m.id);
      setSearchResults(data.filter(u => !existingIds.includes(u.id) && u.id !== user.id));
    }
  };

  const addMember = async (memberId) => {
    const data = await api.post(`/channels/${channel.id}/members`, { memberId });
    if (!data.error) {
      setMembers(m => [...m, data.member]);
      setShowAddMember(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeMember = async (memberId) => {
    const data = await api.delete(`/channels/${channel.id}/members/${memberId}`);
    if (!data.error) {
      setMembers(m => m.filter(mem => mem.id !== memberId));
    }
  };

  const isOwner = user && channel.ownerId === user.id;
  const isAdmin = user && user.role === 'admin';
  const canManageMembers = isOwner || isAdmin;

  return (
    <div className="w-72 border-l border-[var(--border)] bg-[var(--surface-2)] flex flex-col">
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">成员</h3>
          {canManageMembers && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              + 添加成员
            </button>
          )}
        </div>

        {showAddMember && (
          <div className="mb-3">
            <input
              type="text"
              placeholder="搜索用户..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] transition-colors"
            />
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => addMember(u.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--surface-3)] transition-colors text-left"
                  >
                    <Avatar user={u} size="xs" />
                    <span className="text-sm text-[var(--text-primary)]">{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-[var(--surface-3)] text-[var(--text-muted)]">
            {channel.isPublic ? '🔓 公开' : '🔒 私密'}
          </span>
          {isOwner && <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500">👑 所有者</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center text-sm text-[var(--text-muted)] py-4">加载中...</div>
        ) : members.length === 0 ? (
          <div className="text-center text-sm text-[var(--text-muted)] py-4">暂无成员</div>
        ) : (
          <div className="space-y-1">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--surface-3)] transition-colors">
                <Avatar user={member} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)] truncate">{member.username}</div>
                  {channel.ownerId === member.id && (
                    <div className="text-xs text-amber-500">所有者</div>
                  )}
                </div>
                {canManageMembers && channel.ownerId !== member.id && user.id !== member.id && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                  >
                    移除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}