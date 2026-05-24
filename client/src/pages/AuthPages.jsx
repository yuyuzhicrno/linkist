import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--accent)]/30">
            <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9">
              <path d="M12 2L4 7v6c0 5.25 3.5 10.15 8 11.35C16.5 23.15 20 18.25 20 13V7L12 2z" fill="white" fillOpacity="0.9"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">欢迎回来</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">登录你的 Linkist 账户</p>
        </div>

        <Card className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="邮箱"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              label="密码"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
            <Button type="submit" disabled={loading} className="w-full justify-center" size="lg">
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-[var(--text-muted)] mt-4">
          还没有账户？{' '}
          <Link to="/register" className="text-[var(--accent)] hover:underline">立即注册</Link>
        </p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('两次密码不一致'); return; }
    if (form.password.length < 6) { setError('密码至少 6 位'); return; }
    setLoading(true);
    setError('');
    try {
      await register(form.username, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--accent)]/30">
            <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9">
              <path d="M12 2L4 7v6c0 5.25 3.5 10.15 8 11.35C16.5 23.15 20 18.25 20 13V7L12 2z" fill="white" fillOpacity="0.9"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">加入 Linkist</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">创建你的账户，开始探索</p>
        </div>

        <Card className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="用户名"
              placeholder="你的用户名"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
            />
            <Input
              label="邮箱"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              label="密码"
              type="password"
              placeholder="至少 6 位"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
            <Input
              label="确认密码"
              type="password"
              placeholder="再输一次"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              required
            />
            <Button type="submit" disabled={loading} className="w-full justify-center" size="lg">
              {loading ? '注册中...' : '创建账户'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-[var(--text-muted)] mt-4">
          已有账户？{' '}
          <Link to="/login" className="text-[var(--accent)] hover:underline">立即登录</Link>
        </p>
      </div>
    </div>
  );
}
