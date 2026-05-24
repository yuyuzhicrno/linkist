import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api.js';
import { timeAgo } from '../utils/helpers.js';
import { Card, Skeleton, Badge } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Input } from '../components/ui/Input.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const SORTS = [
  { key: 'hot', label: '🔥 热门' },
  { key: 'new', label: '✨ 最新' },
  { key: 'top', label: '⬆ 最高票' },
];

export default function ForumPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState(searchParams.get('sort') || 'hot');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [tag, setTag] = useState(searchParams.get('tag') || '');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/discussion/categories').then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (sort) q.set('sort', sort);
    if (category) q.set('category', category);
    if (tag) q.set('tag', tag);
    if (search) q.set('search', search);
    api.get(`/posts?${q}`).then(data => {
      setPosts(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [sort, category, tag, search]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">讨论区</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">分享想法，探索知识，参与讨论</p>
        </div>
        {user && (
          <Link to="/forum/new"><Button>+ 发帖</Button></Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main */}
        <div className="lg:col-span-3">
          {/* Sort + Search */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--border)]">
              {SORTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sort === s.key ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[200px]">
              <input
                placeholder="搜索帖子..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>

          {/* Filter pills */}
          {(category || tag) && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {category && (
                <button onClick={() => setCategory('')} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-medium">
                  分类：{category} ×
                </button>
              )}
              {tag && (
                <button onClick={() => setTag('')} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-medium">
                  #{tag} ×
                </button>
              )}
            </div>
          )}

          {/* Posts */}
          <div className="space-y-3">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : posts.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-3">🌪</div>
                <div className="text-[var(--text-muted)]">暂无帖子</div>
                {user && <Link to="/forum/new" className="mt-3 inline-block"><Button size="sm">来发第一帖！</Button></Link>}
              </div>
            ) : posts.map(post => (
              <ForumPostCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Categories */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">分类</h3>
            <div className="space-y-1">
              <button
                onClick={() => setCategory('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!category ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}
              >
                全部
              </button>
              {categories.map(c => (
                <button
                  key={c.name}
                  onClick={() => setCategory(c.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between transition-colors ${category === c.name ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}
                >
                  <span>{c.name}</span>
                  <span className="text-[var(--text-muted)] text-xs">{c.count}</span>
                </button>
              ))}
            </div>
          </Card>

          {user && (
            <Card className="p-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-xl mx-auto mb-3">✍</div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">分享你的想法，参与讨论</p>
              <Link to="/forum/new"><Button className="w-full" size="sm">发布帖子</Button></Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ForumPostCard({ post }) {
  return (
    <Link to={`/forum/${post.id}`}>
      <Card hover className="p-4">
        <div className="flex gap-4">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
            <div className="text-[var(--accent)] font-bold">▲</div>
            <div className={`text-sm font-bold ${post.voteCount > 0 ? 'text-[var(--accent)]' : post.voteCount < 0 ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}>
              {post.voteCount}
            </div>
            <div className="text-[var(--text-muted)]">▼</div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {post.isPinned && <Badge className="bg-amber-500/10 text-amber-400">📌 置顶</Badge>}
              {post.flair && <Badge color="var(--accent)">{post.flair}</Badge>}
              <span className="text-xs text-[var(--text-muted)]">in {post.category}</span>
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1.5 line-clamp-2">{post.title}</h3>
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
              <span className="flex items-center gap-1.5">
                <Avatar user={post.author} size="xs" />
                {post.author?.username}
              </span>
              <span>{timeAgo(post.createdAt)}</span>
              <span>💬 {post.commentCount} 评论</span>
              <span>👁 {post.views}</span>
              {post.tags?.slice(0, 3).map(t => (
                <span key={t} className="text-[var(--accent)]">#{t}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
