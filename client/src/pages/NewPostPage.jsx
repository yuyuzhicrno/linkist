import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Card } from '../components/ui/Card.jsx';

const CATEGORIES = ['综合', '技术', '公告', '提问', '分享', '闲聊', '新闻', '创意'];
const FLAIRS = ['', '技术', '提问', '讨论', '分享', '公告', '新闻', '娱乐'];

export default function NewPostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', content: '', category: '综合', tags: '', flair: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  if (!user) return (
    <div className="max-w-lg mx-auto mt-16 text-center">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">请先登录</h2>
      <div className="flex gap-2 justify-center">
        <Link to="/login"><Button>登录</Button></Link>
        <Link to="/register"><Button variant="outline">注册</Button></Link>
      </div>
    </div>
  );

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    setLoading(true);
    setError('');
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const data = await api.post('/posts', { ...form, tags });
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    navigate(`/forum/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/forum" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]">← 返回讨论区</Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-2">发布新帖</h1>
      </div>

      <Card className="p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
        )}

        <Input
          label="标题"
          placeholder="帖子标题"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          maxLength={200}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">分类</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="px-4 py-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)] transition-colors"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Flair 标签</label>
            <select
              value={form.flair}
              onChange={e => setForm(f => ({ ...f, flair: e.target.value }))}
              className="px-4 py-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)] transition-colors"
            >
              {FLAIRS.map(c => <option key={c} value={c}>{c || '无'}</option>)}
            </select>
          </div>
        </div>

        <Input
          label="标签（逗号分隔）"
          placeholder="Rust, 编程, 讨论"
          value={form.tags}
          onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
        />

        {/* Editor / Preview toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--text-secondary)]">正文（支持 Markdown）</label>
            <button
              onClick={() => setPreview(!preview)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              {preview ? '编辑' : '预览'}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[200px] p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] prose prose-sm max-w-none">
              {form.content || <span className="text-[var(--text-muted)] text-sm">暂无内容</span>}
            </div>
          ) : (
            <Textarea
              placeholder="支持 Markdown 语法：## 标题  **粗体**  `代码`  ```代码块```"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={10}
            />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? '发布中...' : '发布帖子'}
          </Button>
          <Link to="/forum"><Button variant="outline">取消</Button></Link>
        </div>
      </Card>
    </div>
  );
}
