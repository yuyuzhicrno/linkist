import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../utils/api.js';
import { timeAgo, formatDate } from '../utils/helpers.js';
import { Card, Badge, Skeleton } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ColumnsPage() {
  const { user } = useAuth();
  const { columnId, articleId } = useParams();
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCol, setNewCol] = useState({ title: '', description: '', coverColor: '#7c3aed' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get('/columns').then(data => {
      setColumns(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (articleId && columnId) return <ArticleDetail columnId={columnId} articleId={articleId} />;
  if (columnId) return <ColumnDetail id={columnId} user={user} />;

  const COLORS = ['#7c3aed', '#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#f97316', '#6366f1'];

  const createColumn = async () => {
    if (!newCol.title.trim()) return;
    setCreating(true);
    const data = await api.post('/columns', newCol);
    if (!data.error) {
      setColumns(c => [...c, { ...data, articleCount: 0 }]);
      setShowCreate(false);
      setNewCol({ title: '', description: '', coverColor: '#7c3aed' });
    }
    setCreating(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">专栏</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">深度文章，知识沉淀</p>
        </div>
        {user && (
          <Button onClick={() => setShowCreate(!showCreate)}>+ 创建专栏</Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">新建专栏</h3>
          <Input label="专栏名称" placeholder="给你的专栏起个名字" value={newCol.title} onChange={e => setNewCol(n => ({ ...n, title: e.target.value }))} />
          <Textarea label="简介" placeholder="介绍一下这个专栏..." value={newCol.description} onChange={e => setNewCol(n => ({ ...n, description: e.target.value }))} rows={2} />
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">封面颜色</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} style={{ background: c }} onClick={() => setNewCol(n => ({ ...n, coverColor: c }))}
                  className={`w-7 h-7 rounded-full transition-transform ${newCol.coverColor === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={createColumn} disabled={creating}>{creating ? '创建中...' : '创建专栏'}</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
          </div>
        </Card>
      )}

      {/* Columns grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.map(col => <ColumnCard key={col.id} col={col} />)}
          {columns.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <div className="text-5xl mb-3">📚</div>
              <div className="text-[var(--text-muted)]">还没有专栏，来创建第一个！</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColumnCard({ col }) {
  return (
    <Link to={`/columns/${col.id}`}>
      <Card hover className="overflow-hidden">
        <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${col.coverColor}30, ${col.coverColor}10)` }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl text-white font-bold shadow-lg" style={{ background: col.coverColor }}>
              {col.title[0]}
            </div>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">{col.title}</h3>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{col.description}</p>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <Avatar user={col.author} size="xs" />
              {col.author?.username}
            </div>
            <div className="flex items-center gap-3">
              <span>📝 {col.articleCount}</span>
              <span>★ {col.followers?.length || 0}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function ColumnDetail({ id, user }) {
  const [col, setCol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWrite, setShowWrite] = useState(false);
  const [article, setArticle] = useState({ title: '', summary: '', content: '', tags: '' });
  const [publishing, setPublishing] = useState(false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    api.get(`/columns/${id}`).then(data => {
      if (!data.error) setCol(data);
      setLoading(false);
    });
  }, [id]);

  const follow = async () => {
    setFollowing(true);
    const data = await api.post(`/columns/${id}/follow`);
    if (!data.error) {
      setCol(c => ({ ...c, followers: data.followed
        ? [...(c.followers || []), 'me']
        : (c.followers || []).slice(0, -1)
      }));
    }
    setFollowing(false);
  };

  const publish = async () => {
    if (!article.title.trim() || !article.content.trim()) return;
    setPublishing(true);
    const tags = article.tags.split(',').map(t => t.trim()).filter(Boolean);
    const data = await api.post(`/columns/${id}/articles`, { ...article, tags });
    if (!data.error) {
      setCol(c => ({ ...c, articles: [...(c.articles || []), data] }));
      setShowWrite(false);
      setArticle({ title: '', summary: '', content: '', tags: '' });
    }
    setPublishing(false);
  };

  if (loading) return <div className="text-center py-16 text-[var(--text-muted)]">加载中...</div>;
  if (!col) return <div className="text-center py-16 text-[var(--text-muted)]">专栏不存在</div>;

  const isOwner = user && user.id === col.authorId;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/columns" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] mb-4 block">← 返回专栏</Link>

      {/* Column header */}
      <div className="rounded-3xl overflow-hidden mb-6 border border-[var(--border)]">
        <div className="h-36 relative" style={{ background: `linear-gradient(135deg, ${col.coverColor}40, ${col.coverColor}10)` }}>
          <div className="absolute inset-0 flex items-end p-6">
            <div className="flex items-end gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white font-bold shadow-xl" style={{ background: col.coverColor }}>
                {col.title[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow">{col.title}</h1>
                <p className="text-white/70 text-sm mt-0.5">{col.description}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[var(--surface-2)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Avatar user={col.author} size="xs" />
              {col.author?.username}
            </span>
            <span>📝 {col.articles?.length || 0} 篇文章</span>
            <span>★ {col.followers?.length || 0} 关注</span>
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <Button size="sm" onClick={() => setShowWrite(!showWrite)}>
                {showWrite ? '取消' : '✍ 写文章'}
              </Button>
            )}
            {user && !isOwner && (
              <Button size="sm" variant="outline" onClick={follow} disabled={following}>
                {following ? '...' : '关注专栏'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Write article form */}
      {showWrite && (
        <Card className="p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">写新文章</h3>
          <Input label="标题" value={article.title} onChange={e => setArticle(a => ({ ...a, title: e.target.value }))} placeholder="文章标题" />
          <Textarea label="摘要" value={article.summary} onChange={e => setArticle(a => ({ ...a, summary: e.target.value }))} rows={2} placeholder="一句话描述文章内容" />
          <Textarea label="正文（Markdown）" value={article.content} onChange={e => setArticle(a => ({ ...a, content: e.target.value }))} rows={12} placeholder="# 文章标题\n\n正文内容..." />
          <Input label="标签（逗号分隔）" value={article.tags} onChange={e => setArticle(a => ({ ...a, tags: e.target.value }))} placeholder="Rust, 编程, 入门" />
          <div className="flex gap-2">
            <Button onClick={publish} disabled={publishing}>{publishing ? '发布中...' : '发布文章'}</Button>
            <Button variant="outline" onClick={() => setShowWrite(false)}>取消</Button>
          </div>
        </Card>
      )}

      {/* Article list */}
      <div className="space-y-4">
        {(col.articles || []).length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">还没有文章</div>
        ) : (
          [...col.articles].reverse().map(art => (
            <Link key={art.id} to={`/columns/${col.id}/articles/${art.id}`}>
              <Card hover className="p-5">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">{art.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-3">{art.summary}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
                      <span>{formatDate(art.createdAt)}</span>
                      <span>⏱ {art.readTime} 分钟</span>
                      <span>👁 {art.views}</span>
                      <span>❤ {art.likes?.length || 0}</span>
                      {art.tags?.map(t => <span key={t} className="text-[var(--accent)]">#{t}</span>)}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function ArticleDetail({ columnId, articleId }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/columns/${columnId}/articles/${articleId}`).then(d => {
      if (!d.error) {
        setData(d);
        if (user) setLiked(d.likes?.includes(user.id));
      }
      setLoading(false);
    });
  }, [columnId, articleId]);

  const like = async () => {
    if (!user) return;
    const res = await api.post(`/columns/${columnId}/articles/${articleId}/like`);
    if (!res.error) {
      setLiked(res.liked);
      setData(d => ({ ...d, likes: Array(res.likes).fill(null) }));
    }
  };

  if (loading) return <div className="text-center py-16 text-[var(--text-muted)]">加载中...</div>;
  if (!data) return <div className="text-center py-16">文章不存在</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link to={`/columns/${columnId}`} className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] mb-4 block">
        ← 返回《{data.column?.title}》
      </Link>

      <article>
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mb-3">{data.title}</h1>
          <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] flex-wrap">
            <span className="flex items-center gap-1.5">
              <Avatar user={data.column?.author} size="xs" />
              {data.column?.author?.username}
            </span>
            <span>{formatDate(data.createdAt)}</span>
            <span>⏱ 约 {data.readTime} 分钟阅读</span>
            <span>👁 {data.views}</span>
          </div>
          {data.tags?.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {data.tags.map(t => <Badge key={t} color="var(--accent)">#{t}</Badge>)}
            </div>
          )}
        </div>

        <Card className="p-6">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
          </div>
        </Card>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={like}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all
              ${liked ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/30'}`}
          >
            ❤ {liked ? '已喜欢' : '喜欢'} · {data.likes?.length || 0}
          </button>
          <Link to={`/columns/${columnId}`}>
            <Button variant="ghost" size="sm">查看专栏更多文章</Button>
          </Link>
        </div>
      </article>
    </div>
  );
}
