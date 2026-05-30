import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ChannelSidebar } from '../components/channels/ChannelSidebar.jsx';
import { ChatArea } from '../components/channels/ChatArea.jsx';

export default function ChannelsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const handleChannelSelect = (id) => {
    setActiveId(id);
    navigate(`/channels/${id}`);
  };

  const handleChannelCreated = (channel) => {
    setChannels(c => [...c, channel]);
  };

  const activeChannel = channels.find(c => c.id === activeId);

  return (
    <div className="h-full flex overflow-hidden">
      <div className="w-64 flex-shrink-0 flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border)]">
        <ChannelSidebar
          channels={channels}
          loading={loading}
          user={user}
          activeId={activeId}
          onSelect={handleChannelSelect}
          onCreated={handleChannelCreated}
        />
      </div>

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