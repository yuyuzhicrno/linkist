import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api.js';
import { formatDate } from '../../utils/helpers.js';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { Avatar } from '../ui/Avatar.jsx';

export function ColumnDetail({ id, user }) {
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