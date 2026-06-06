import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import DebateWidget from '../components/ui/DebateWidget.jsx';

export default function DebateDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDebate();
  }, [id]);

  const loadDebate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDebate(id);
      setDebate(data);
    } catch (err) {
      setError(err.message || '加载争辩帖失败');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-8 text-center">
        <p className="text-[var(--text-muted)]">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
        <Link to="/debates" className="text-sm text-[var(--accent)] hover:underline mt-4 inline-block">
          ← 返回争辩帖列表
        </Link>
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="max-w-4xl mx-auto mt-8 text-center">
        <p className="text-[var(--text-muted)]">争辩帖不存在</p>
        <Link to="/debates" className="text-sm text-[var(--accent)] hover:underline mt-4 inline-block">
          ← 返回争辩帖列表
        </Link>
      </div>
    );
  }

  const isEnded = debate.status === 'resolved' || new Date(debate.expiresAt) < new Date();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/debates" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]">
          ← 返回争辩帖列表
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-2xl">⚖️</span>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">争辩帖</h1>
          {isEnded && (
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
              已结束
            </span>
          )}
        </div>
      </div>

      {/* Debate Content */}
      <Card className="p-6">
        <DebateWidget debate={debate} />
      </Card>

      {/* Info */}
      <div className="mt-4 flex items-center gap-4 text-sm text-[var(--text-muted)]">
        <span>创建时间：{new Date(debate.createdAt).toLocaleString()}</span>
        <span>截止时间：{new Date(debate.expiresAt).toLocaleString()}</span>
      </div>
    </div>
  );
}