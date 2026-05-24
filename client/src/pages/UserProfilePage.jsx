import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { timeAgo, formatDate } from '../utils/helpers.js';
import { Card, Badge } from '../components/ui/Card.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';

export default function UserProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');

  useEffect(() => {
    api.get(`/users/${username}`).then(data => {
      if (!data.error) setProfile(data);
      setLoading(false);
    });
  }, [username]);

  if (loading) return <div className="text-center py-16 text-[var(--text-muted)]">加载中...</div>;
  if (!profile) return <div className="text-center py-16"><h2 className="text-xl font-bold">用户不存在</h2></div>;

  const TABS = [
    { key: 'posts', label: `帖子 (${profile.stats?.posts || 0})` },
    { key: 'columns', label: `专栏 (${profile.stats?.columns || 0})` },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-start gap-5">
          <Avatar user={profile} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{profile.username}</h1>
              {profile.role === 'admin' && (
                <Badge color="#f97316">管理员</Badge>
              )}
            </div>
            {profile.bio && <p className="text-[var(--text-secondary)] text-sm mb-3">{profile.bio}</p>}
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span>加入于 {formatDate(profile.createdAt)}</span>
              <span>📝 {profile.stats?.posts} 帖子</span>
              <span>📚 {profile.stats?.columns} 专栏</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--border)]">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'posts' && (
        <div className="space-y-3">
          {profile.posts?.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">还没有帖子</div>
          ) : profile.posts?.map(p => (
            <Link key={p.id} to={`/forum/${p.id}`}>
              <Card hover className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)] mb-1">{p.title}</h3>
                    <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                      <span>{p.category}</span>
                      <span>▲ {p.voteCount}</span>
                      <span>💬 {p.commentCount}</span>
                      <span>{timeAgo(p.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {tab === 'columns' && (
        <div className="space-y-3">
          {profile.columns?.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">还没有专栏</div>
          ) : profile.columns?.map(c => (
            <Link key={c.id} to={`/columns/${c.id}`}>
              <Card hover className="p-4">
                <div className="flex justify-between">
                  <h3 className="font-medium text-[var(--text-primary)]">{c.title}</h3>
                  <div className="text-xs text-[var(--text-muted)] flex gap-3">
                    <span>📝 {c.articleCount}</span>
                    <span>★ {c.followers}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
