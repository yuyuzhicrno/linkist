import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { timeAgo } from '../utils/helpers.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ChannelsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', icon: '💬', color: '#7c3aed', isPublic: true });
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const { channelId } = useParams();

  useEffect(() => {
    api.get('/channels').then(data => {
      setChannels(Array.isArray(data) ? data : []);
      setLoading(false);
      if (channelId) setActiveId(channelId);
      else if (data?.length > 0) setActiveId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (channelId) setActiveId(channelId);
  }, [channelId]);

  const createChannel = async () => {
    if (!newChannel.name.trim()) return;
    setCreating(true);
    const data = await api.post('/channels', newChannel);
    if (!data.error) {
      setChannels(c => [...c, { ...data, messageCount: 0, lastMessage: null }]);
      setShowCreate(false);
      setActiveId(data.id);
    }
    setCreating(false);
  };

  const ICONS = ['💬', '🦀', '🎵', '🎮', '📚', '🎨', '🔥', '🌟', '🚀', '💡', '🛠', '🌍'];
  const COLORS = ['#7c3aed', '#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#f97316'];

  const activeChannel = channels.find(c => c.id === activeId);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Channel Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border)]">
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

        {/* Create channel form */}
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

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            <div className="p-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>
          ) : channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => { setActiveId(ch.id); navigate(`/channels/${ch.id}`); }}
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
      </div>

      {/* Chat Area */}
      {activeChannel ? (
        <ChatArea channel={activeChannel} user={user} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] flex-col gap-3">
          <div className="text-5xl">💬</div>
          <div className="text-sm">选择一个频道开始聊天</div>
        </div>
      )}
    </div>
  );
}

function ChatArea({ channel, user }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const channelId = channel.id;

  useEffect(() => {
    setLoading(true);
    api.get(`/channels/${channelId}`).then(data => {
      setMessages(data.messages || []);
      setLoading(false);
    });
  }, [channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const msg = await api.post(`/channels/${channelId}/messages`, { content: input });
    if (!msg.error) {
      setMessages(m => [...m, msg]);
      setInput('');
    }
    setSending(false);
  };

  const react = async (msgId, emoji) => {
    if (!user) return;
    const data = await api.post(`/channels/${channelId}/messages/${msgId}/react`, { emoji });
    if (!data.error) {
      setMessages(msgs => msgs.map(m => m.id === msgId ? { ...m, reactions: data } : m));
    }
  };

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Channel header */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-[var(--border)] bg-[var(--channel-bg)] flex-shrink-0">
        <span className="text-xl">{channel.icon}</span>
        <div>
          <div className="font-semibold text-sm text-[var(--text-primary)]">{channel.name}</div>
          <div className="text-xs text-[var(--text-muted)]">{channel.description}</div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>👥 {channel.memberIds?.length || 0}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading ? (
          <div className="text-center text-[var(--text-muted)] text-sm">加载消息...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">{channel.icon}</div>
            <div className="font-semibold text-[var(--text-primary)]">#{channel.name} 的开始</div>
            <div className="text-sm text-[var(--text-muted)] mt-1">来发第一条消息！</div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const grouped = prev && prev.authorId === msg.authorId &&
                (new Date(msg.createdAt) - new Date(prev.createdAt)) < 5 * 60 * 1000;
              return (
                <MessageItem key={msg.id} msg={msg} grouped={grouped} onReact={react} quickReactions={QUICK_REACTIONS} currentUser={user} />
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)] flex-shrink-0">
        {user ? (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`在 #${channel.name} 中发消息`}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:border-[var(--accent)] transition-colors"
            />
            <Button onClick={send} disabled={sending || !input.trim()} size="sm">
              发送
            </Button>
          </div>
        ) : (
          <div className="text-center text-sm text-[var(--text-muted)] py-2">
            <Link to="/login" className="text-[var(--accent)] hover:underline">登录</Link>后参与聊天
          </div>
        )}
      </div>
    </div>
  );
}

function MessageItem({ msg, grouped, onReact, quickReactions, currentUser }) {
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
        {/* Reactions */}
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
      {/* Hover actions */}
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
