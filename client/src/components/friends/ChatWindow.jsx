import { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { timeAgo } from '../../utils/helpers.js';
import { onDmMessage } from '../../services/socket.js';
import LevelBadge from '../ui/LevelBadge.jsx';
import { Avatar } from '../ui/Avatar.jsx';

export function ChatWindow({ targetUser, onBack }) {
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