import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Card } from '../components/ui/Card.jsx';

const MIN_DURATION_DAYS = 7;

export default function NewDebatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    proposition: '',
    expiresAt: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculate minimum expiry date (7 days from now)
  const minExpiryDate = new Date();
  minExpiryDate.setDate(minExpiryDate.getDate() + MIN_DURATION_DAYS);
  const minExpiryStr = minExpiryDate.toISOString().split('T')[0];

  if (!user) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">请先登录</h2>
        <div className="flex gap-2 justify-center">
          <Link to="/login"><Button>登录</Button></Link>
          <Link to="/register"><Button variant="outline">注册</Button></Link>
        </div>
      </div>
    );
  }

  const submit = async () => {
    if (!form.proposition.trim()) {
      setError('命题内容不能为空');
      return;
    }
    if (!form.expiresAt) {
      setError('截止时间不能为空');
      return;
    }

    const selectedDate = new Date(form.expiresAt);
    const now = new Date();
    const minDate = new Date(now.getTime() + MIN_DURATION_DAYS * 24 * 60 * 60 * 1000);

    if (selectedDate < minDate) {
      setError(`截止时间不得少于 ${MIN_DURATION_DAYS} 天`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await api.createDebate({
        proposition: form.proposition,
        expiresAt: selectedDate.toISOString()
      });
      navigate(`/debates/${data.id}`);
    } catch (err) {
      setError(err.message || '创建争辩帖失败');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/debates" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]">
          ← 返回争辩帖列表
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-2xl">⚖️</span>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">发起争辩帖</h1>
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          提出一个命题，邀请大家辩论。支持方和反对方可以发表论点并进行投票。
        </p>
      </div>

      {/* Form */}
      <Card className="p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Proposition */}
        <Textarea
          label="命题内容"
          placeholder="例如：人工智能将在未来10年内超越人类智慧"
          value={form.proposition}
          onChange={e => setForm(f => ({ ...f, proposition: e.target.value }))}
          rows={3}
        />

        {/* Expiry Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            截止时间（最少 {MIN_DURATION_DAYS} 天）
          </label>
          <input
            type="date"
            min={minExpiryStr}
            value={form.expiresAt}
            onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Info */}
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-xs text-[var(--text-muted)]">
          <p>• 需要达到 5 级才能发起争辩帖</p>
          <p>• 截止时间不得少于 7 天，无上限</p>
          <p>• 双方可以发表论点并进行投票</p>
          <p>• 截止时间后票数高的一方获胜</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? '创建中...' : '发起争辩'}
          </Button>
          <Link to="/debates">
            <Button variant="outline">取消</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}