import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Card } from '../components/ui/Card.jsx';

const CATEGORIES = ['综合', '技术', '公告', '提问', '分享', '闲聊', '新闻', '创意'];
const FLAIRS = ['', '技术', '提问', '讨论', '分享', '公告', '新闻', '娱乐'];
const POST_TYPES = ['普通帖子', '投票帖'];

export default function NewPostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: '综合',
    tags: '',
    flair: '',
    postType: '普通帖子'
  });
  const [pollForm, setPollForm] = useState({
    question: '',
    options: ['', ''],
    allowMultiple: false,
    endsAt: ''
  });
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

  const addPollOption = () => {
    setPollForm(p => ({ ...p, options: [...p.options, '' ]}));
  };

  const removePollOption = (idx) => {
    if (pollForm.options.length <= 2) return;
    setPollForm(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }));
  };

  const updatePollOption = (idx, value) => {
    setPollForm(p => ({ ...p, options: p.options.map((o, i) => i === idx ? value : o) }));
  };

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('标题和内容不能为空');
      return;
    }

    if (form.postType === '投票帖') {
      if (!pollForm.question.trim()) {
        setError('投票问题不能为空');
        return;
      }
      const validOptions = pollForm.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        setError('至少需要 2 个投票选项');
        return;
      }
    }

    setLoading(true);
    setError('');
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const data = await api.post('/posts', { ...form, tags });
    setLoading(false);
    if (data.error) { setError(data.error); return; }

    // Create poll if post type is poll
    if (form.postType === '投票帖') {
      try {
        const validOptions = pollForm.options.filter(o => o.trim());
        await api.createPoll({
          question: pollForm.question,
          options: validOptions,
          allowMultiple: pollForm.allowMultiple,
          endsAt: pollForm.endsAt,
          postId: data.id
        });
      } catch (err) {
        console.error('创建投票失败:', err);
      }
    }

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

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">帖子类型</label>
            <select
              value={form.postType}
              onChange={e => setForm(f => ({ ...f, postType: e.target.value }))}
              className="px-4 py-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)] transition-colors"
            >
              {POST_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
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

        {/* Poll Form (only show when post type is poll) */}
        {form.postType === '投票帖' && (
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📊</span>
              <h3 className="font-semibold text-[var(--text-primary)]">投票设置</h3>
            </div>

            <Input
              label="投票问题"
              placeholder="例如：你更喜欢哪种编程语言？"
              value={pollForm.question}
              onChange={e => setPollForm(p => ({ ...p, question: e.target.value }))}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">投票选项</label>
              {pollForm.options.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`选项 ${idx + 1}`}
                    value={opt}
                    onChange={e => updatePollOption(idx, e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)] transition-colors"
                  />
                  {pollForm.options.length > 2 && (
                    <button
                      onClick={() => removePollOption(idx)}
                      className="px-3 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addPollOption}
                className="text-sm text-[var(--accent)] hover:underline mt-1"
              >
                + 添加选项
              </button>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={pollForm.allowMultiple}
                  onChange={e => setPollForm(p => ({ ...p, allowMultiple: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border)]"
                />
                允许多选
              </label>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">截止时间（可选）</label>
                <input
                  type="datetime-local"
                  value={pollForm.endsAt}
                  onChange={e => setPollForm(p => ({ ...p, endsAt: e.target.value }))}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
              需要达到 3 级才能发起投票帖
            </div>
          </div>
        )}

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
