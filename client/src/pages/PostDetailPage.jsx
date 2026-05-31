import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../utils/api.js';
import { timeAgo } from '../utils/helpers.js';
import { Card, Badge, Skeleton } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Textarea } from '../components/ui/Input.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function PostDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userVote, setUserVote] = useState(null); // 'up' | 'down' | null

  useEffect(() => {
    api.get(`/posts/${id}`).then(data => {
      if (!data.error) {
        setPost(data);
        if (user) {
          if (data.upvotes?.includes(user.id)) setUserVote('up');
          else if (data.downvotes?.includes(user.id)) setUserVote('down');
        }
      }
      setLoading(false);
    });
  }, [id]);

  const vote = async (type) => {
    if (!user) return;
    const newType = userVote === type ? 'none' : type;
    setUserVote(newType === 'none' ? null : newType);
    const data = await api.post(`/posts/${id}/vote`, { type: newType });
    setPost(p => ({ ...p, upvotes: data.upvotes, downvotes: data.downvotes, voteCount: data.voteCount }));
  };

  const togglePin = async () => {
    const data = await api.patch(`/posts/${id}/pin`);
    if (!data.error) {
      setPost(p => ({ ...p, isPinned: data.isPinned }));
    }
  };

  const submitComment = async () => {
    if (!comment.trim() || !user) return;
    setSubmitting(true);
    const c = await api.post(`/posts/${id}/comments`, { content: comment });
    if (!c.error) {
      setPost(p => ({ ...p, comments: [...(p.comments || []), c], commentCount: (p.commentCount || 0) + 1 }));
      setComment('');
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  if (!post) return (
    <div className="max-w-3xl mx-auto text-center py-20">
      <div className="text-5xl mb-4">404</div>
      <p className="text-[var(--text-muted)]">帖子不存在</p>
      <Link to="/forum"><Button variant="ghost" className="mt-4">返回讨论区</Button></Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Link to="/forum" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1">
          ← 返回讨论区
        </Link>
      </div>

      <Card className="p-6 mb-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Vote */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <button
              onClick={() => vote('up')}
              className={`vote-btn p-2 rounded-lg transition-all ${userVote === 'up' ? 'active-up bg-orange-500/10' : 'hover:bg-[var(--surface-3)] text-[var(--text-muted)]'}`}
            >
              <svg viewBox="0 0 24 24" fill={userVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className={`font-bold text-sm ${post.voteCount > 0 ? 'text-orange-500' : post.voteCount < 0 ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}>
              {post.voteCount}
            </span>
            <button
              onClick={() => vote('down')}
              className={`vote-btn p-2 rounded-lg transition-all ${userVote === 'down' ? 'active-down bg-cyan-500/10' : 'hover:bg-[var(--surface-3)] text-[var(--text-muted)]'}`}
            >
              <svg viewBox="0 0 24 24" fill={userVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {post.isPinned && <Badge className="bg-amber-500/10 text-amber-400">📌 置顶</Badge>}
              {post.flair && <Badge color="var(--accent)">{post.flair}</Badge>}
              <span className="text-xs text-[var(--text-muted)]">{post.category}</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-3">{post.title}</h1>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-4">
              <Link to={`/user/${post.author?.username}`} className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
                <Avatar user={post.author} size="xs" />
                {post.author?.username}
              </Link>
              <span>{timeAgo(post.createdAt)}</span>
              <span>👁 {post.views}</span>
              {(user && (user.id === post.authorId || user.role === 'admin')) && (
                <button
                  onClick={togglePin}
                  className={`ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    post.isPinned 
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' 
                      : 'bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  📌 {post.isPinned ? '取消置顶' : '置顶'}
                </button>
              )}
            </div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
            </div>
            {post.tags?.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {post.tags.map(t => (
                  <Link key={t} to={`/forum?tag=${t}`}>
                    <Badge className="bg-[var(--surface-3)] text-[var(--accent)] hover:bg-[var(--accent)]/15 transition-colors cursor-pointer">#{t}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Comments */}
      <div className="mb-4">
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">{post.comments?.length || 0} 条评论</h2>

        {/* Comment box */}
        {user ? (
          <Card className="p-4 mb-4">
            <div className="flex gap-3">
              <Avatar user={user} size="sm" />
              <div className="flex-1">
                <Textarea
                  placeholder="写下你的评论..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={submitComment} disabled={submitting || !comment.trim()} size="sm">
                    {submitting ? '发送中...' : '发表评论'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 mb-4 text-center">
            <p className="text-sm text-[var(--text-muted)] mb-2">登录后参与讨论</p>
            <div className="flex gap-2 justify-center">
              <Link to="/login"><Button size="sm" variant="outline">登录</Button></Link>
              <Link to="/register"><Button size="sm">注册</Button></Link>
            </div>
          </Card>
        )}

        {/* Comment list */}
        <div className="space-y-3">
          {post.comments?.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex gap-3">
                <Avatar user={c.author} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/user/${c.author?.username}`} className="font-medium text-sm text-[var(--text-primary)] hover:text-[var(--accent)]">
                      {c.author?.username}
                    </Link>
                    <span className="text-xs text-[var(--text-muted)]">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{c.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                    <span>▲ {c.upvotes?.length || 0}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
