import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api.js';
import LevelBadge from '../ui/LevelBadge.jsx';
import { Avatar } from '../ui/Avatar.jsx';

export function FriendsPanel({ onChat }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getFriends().then(data => {
      if (data.friends) setFriends(data.friends);
      if (data.requests) setRequests(data.requests);
    });
  }, []);

  const handleSearch = async (q) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const results = await api.get(`/users?q=${encodeURIComponent(q)}`);
    setSearchResults(Array.isArray(results) ? results : []);
  };

  const sendRequest = async (targetId) => {
    const r = await api.sendFriendRequest(targetId);
    if (!r.error) alert('好友申请已发送！');
    else alert(r.error);
  };

  const acceptRequest = async (requesterId) => {
    await api.acceptFriendRequest(requesterId);
    const data = await api.getFriends();
    setFriends(data.friends || []); setRequests(data.requests || []);
  };

  const removeFriend = async (otherId) => {
    await api.removeFriend(otherId);
    setFriends(prev => prev.filter(f => f.id !== otherId));
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">添加好友</h3>
        <input
          value={searchQ}
          onChange={e => handleSearch(e.target.value)}
          placeholder="搜索用户名..."
          className="input-base w-full"
        />
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1">
            {searchResults.map(u => (
              <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-secondary)]">
                <Avatar user={u} size={32} />
                <Link to={`/user/${u.username}`} className="flex-1 text-sm font-medium hover:text-[var(--accent)]">
                  {u.username}
                </Link>
                {u.levelInfo && <LevelBadge levelInfo={u.levelInfo} size="xs" />}
                <button onClick={() => sendRequest(u.id)}
                  className="text-xs px-2 py-1 rounded-lg bg-[var(--accent)] text-white hover:opacity-80">
                  加好友
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {requests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
            好友申请 <span className="text-[var(--accent)]">{requests.length}</span>
          </h3>
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--accent)]">
                <Avatar user={r} size={32} />
                <span className="flex-1 text-sm font-medium">{r.username}</span>
                <button onClick={() => acceptRequest(r.id)}
                  className="text-xs px-2 py-1 rounded-lg bg-green-600 text-white hover:opacity-80">
                  接受
                </button>
                <button onClick={() => api.removeFriend(r.id).then(() => setRequests(prev => prev.filter(x => x.id !== r.id)))}
                  className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:opacity-80">
                  拒绝
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          好友 ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">还没有好友，去搜索添加吧！</p>
        ) : (
          <div className="space-y-1">
            {friends.map(f => (
              <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-secondary)] group">
                <Avatar user={f} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link to={`/user/${f.username}`} className="text-sm font-medium hover:text-[var(--accent)] truncate">
                      {f.username}
                    </Link>
                    {f.levelInfo && <LevelBadge levelInfo={f.levelInfo} size="xs" />}
                  </div>
                </div>
                <button onClick={() => onChat(f)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-[var(--accent)] text-white transition-opacity"
                  title="私信">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
                <button onClick={() => removeFriend(f.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-opacity"
                  title="删除好友">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}