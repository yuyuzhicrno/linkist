import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api.js';
import { Button } from '../ui/Button.jsx';
import { MessageItem } from './MessageItem.jsx';
import { joinChannel, leaveChannel, onChannelMessage, onChannelReaction } from '../../services/socket.js';

export function ChatArea({ channel, user }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const channelId = channel.id;

  useEffect(() => {
    setLoading(true);
    joinChannel(channelId);
    api.get(`/channels/${channelId}`).then(data => {
      setMessages(data.messages || []);
      setLoading(false);
    });

    return () => {
      leaveChannel(channelId);
    };
  }, [channelId]);

  useEffect(() => {
    const unsubMessage = onChannelMessage((msg) => {
      if (msg.authorId !== user?.id) {
        setMessages(m => [...m, msg]);
      }
    });

    const unsubReaction = onChannelReaction(({ messageId, reactions }) => {
      setMessages(m => m.map(msg => msg.id === messageId ? { ...msg, reactions } : msg));
    });

    return () => {
      unsubMessage();
      unsubReaction();
    };
  }, [user]);

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