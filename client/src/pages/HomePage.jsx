import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { timeAgo } from '../utils/helpers.js';
import { Card, Skeleton, Badge } from '../components/ui/Card.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/discussion/stats'),
      api.get('/posts?sort=hot')
    ]).then(([s, p]) => {
      setStats(s);
      setPosts(p.slice(0, 6));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl mb-8 p-8 bg-gradient-to-br from-[var(--accent)]/20 via-[var(--surface-2)] to-[var(--surface-3)] border border-[var(--border)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            下一代社区平台
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-3">
            欢迎来到 <span style={{ color: 'var(--accent)' }}>Linkist</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-lg mb-6">
            融合 Reddit 的讨论精华、Discord 的即时频道与专栏深度创作，一站式打造你的知识社区。
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <>
                <Link to="/forum/new"><Button>发布帖子</Button></Link>
                <Link to="/channels"><Button variant="outline">进入频道</Button></Link>
              </>
            ) : (
              <>
                <Link to="/register"><Button>免费加入</Button></Link>
                <Link to="/forum"><Button variant="outline">探索社区</Button></Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: '帖子', value: stats.totalPosts, emoji: '📝' },
            { label: '成员', value: stats.totalUsers, emoji: '👥' },
            { label: '频道', value: stats.totalChannels, emoji: '#' },
            { label: '消息', value: stats.totalMessages, emoji: '💬' },
          ].map(({ label, value, emoji }) => (
            <Card key={label} className="p-4 text-center">
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
              <div className="text-xs text-[var(--text-muted)]">{label}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hot Posts */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-[var(--text-primary)]">热门讨论</h2>
            <Link to="/forum" className="text-sm text-[var(--accent)] hover:underline">查看全部</Link>
          </div>
          <div className="space-y-3">
            {loading ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
                <Skeleton className="w-10 h-16 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            )) : posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Trending Tags */}
          {stats?.trendingTags?.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">热门标签</h3>
              <div className="flex flex-wrap gap-2">
                {stats.trendingTags.map(({ tag, count }) => (
                  <Link key={tag} to={`/forum?tag=${tag}`}>
                    <Badge className="bg-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/15 hover:text-[var(--accent)] transition-colors cursor-pointer">
                      #{tag} <span className="ml-1 text-[var(--text-muted)]">{count}</span>
                    </Badge>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Links */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">快速入口</h3>
            <div className="space-y-2">
              {[
                { to: '/forum', label: '讨论区', desc: '发帖、投票、评论', icon: '◈' },
                { to: '/channels', label: '频道聊天', desc: '实时消息交流', icon: '#' },
                { to: '/columns', label: '专栏创作', desc: '发表长篇文章', icon: '▤' },
              ].map(({ to, label, desc, icon }) => (
                <Link key={to} to={to}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-3)] transition-colors group">
                  <span className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] text-sm font-bold group-hover:bg-[var(--accent)]/20 transition-colors">
                    {icon}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post }) {
  return (
    <Link to={`/forum/${post.id}`}>
      <div className="flex gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/30 hover:bg-[var(--surface-3)] transition-all">
        {/* Vote */}
        <div className="flex flex-col items-center w-8 flex-shrink-0">
          <div className={`text-sm font-bold ${post.voteCount > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
            {post.voteCount}
          </div>
          <div className="text-xs text-[var(--text-muted)]">票</div>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {post.flair && <Badge color="var(--accent)">{post.flair}</Badge>}
            {post.isPinned && <Badge className="bg-amber-500/10 text-amber-400">置顶</Badge>}
          </div>
          <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 mb-1">{post.title}</h3>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Avatar user={post.author} size="xs" />
              {post.author?.username}
            </span>
            <span>{timeAgo(post.createdAt)}</span>
            <span>💬 {post.commentCount}</span>
            <span>👁 {post.views}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
