import { useState } from 'react';
import { FriendsPanel } from '../components/friends/FriendsPanel.jsx';
import { ChatWindow } from '../components/friends/ChatWindow.jsx';
import { DMList } from '../components/friends/DMList.jsx';

export default function FriendsPage() {
  const [tab, setTab] = useState('friends');
  const [chatTarget, setChatTarget] = useState(null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        <div className="w-72 flex-shrink-0">
          <div className="card-base overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
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