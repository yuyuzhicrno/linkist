import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { timeAgo } from '../utils/helpers.js';
import { onDmMessage } from '../services/socket.js';
import LevelBadge from '../components/ui/LevelBadge.jsx';

function Avatar({ user, size = 36 }) {
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '??';
  if (user?.avatar) return (
    <img src={user.avatar} alt={user.username} className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} />
  );
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.3, background: 'var(--accent)' }}>
      {initials}
    </div>
  );
}

// ─── Friends Panel ─────────────────────────────────────────────────

function FriendsPanel({ onChat }) {
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
      {/* Search to add friends */}
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

      {/* Friend Requests */}
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

      {/* Friends List */}
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

// ─── Chat Window ────────────────────────────────────────────────────

function ChatWindow({ targetUser, onBack }) {
  const { user: me } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    if (!targetUser?.id) return;
    api.getDM(targetUser.id).then(data => {
      if (data.messages) setMessages(data.messages);
    });
  }, [targetUser]);

  useEffect(() => {
    const unsub = onDmMessage(({ message }) => {
      if (message.sender?.id === targetUser?.id || message.senderId === targetUser?.id) {
        setMessages(prev => [...prev, message]);
      }
    });
    return unsub;
  }, [targetUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const msg = await api.sendDM(targetUser.id, input.trim());
    if (!msg.error) { setMessages(prev => [...prev, msg]); setInput(''); }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        {onBack && (
          <button onClick={onBack} className="p-1 rounded hover:bg-[var(--bg-secondary)] mr-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <Avatar user={targetUser} size={36} />
        <div>
          <p className="font-semibold text-[var(--text-primary)]">{targetUser?.username}</p>
          {targetUser?.levelInfo && <LevelBadge levelInfo={targetUser.levelInfo} size="xs" />}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-muted)] py-12">
            <p className="text-4xl mb-2">💬</p>
            <p>发送第一条消息吧！</p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.senderId === me?.id || msg.sender?.id === me?.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
              <Avatar user={isMine ? me : targetUser} size={28} />
              <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div
                  className="px-3 py-2 rounded-2xl text-sm"
                  style={{
                    background: isMine ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: isMine ? '#fff' : 'var(--text-primary)',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                  }}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] px-1">{timeAgo(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
            placeholder={`发消息给 ${targetUser?.username}...`}
            className="input-base flex-1"
          />
          <button
            onClick={sendMsg}
            disabled={!input.trim() || sending}
            className="px-4 py-2 rounded-xl text-white disabled:opacity-50 transition-all"
            style={{ background: 'var(--accent)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DM List ────────────────────────────────────────────────────────

function DMList({ onSelect }) {
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

// ─── Main Page ──────────────────────────────────────────────────────

export default function FriendsPage() {
  const [tab, setTab] = useState('friends'); // 'friends' | 'dms'
  const [chatTarget, setChatTarget] = useState(null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        {/* Left panel */}
        <div className="w-72 flex-shrink-0">
          <div className="card-base overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
            {/* Tabs */}
            <div className="flex border-b border-[var(--border)]">
              {[['friends', '👥 好友'], ['dms', '💬 私信']].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === key
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                  {label}
                </button>
              ))}
            </div>
            {tab === 'friends'
              ? <FriendsPanel onChat={user => { setChatTarget(user); setTab('dms'); }} />
              : <DMList onSelect={user => setChatTarget(user)} />}
          </div>
        </div>

        {/* Right chat window */}
        <div className="flex-1">
          <div className="card-base overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
            {chatTarget ? (
              <ChatWindow targetUser={chatTarget} onBack={() => setChatTarget(null)} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                <p className="text-5xl mb-4">💌</p>
                <p className="text-lg font-medium">选择一个好友开始私聊</p>
                <p className="text-sm mt-1">从左侧好友列表点击私信图标</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
