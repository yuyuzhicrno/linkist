import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../../utils/api.js';
import { formatDate } from '../../utils/helpers.js';
import { Card, Badge } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export function ArticleDetail({ columnId, articleId }) {
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