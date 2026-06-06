import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';

export default function DebatesPage() {
  const { user } = useAuth();
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDebates();
  }, []);

  const loadDebates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDebates();
      setDebates(data.debates || []);
    } catch (err) {
      setError(err.message || '加载争辩帖列表失败');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚖️</span>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">争辩帖</h1>
          </div>
          {user && (
            <Link to="/debates/new">
              <Button>发起争辩</Button>
            </Link>
          )}
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          发起命题，双方辩论，票高者胜。需要达到 5 级才能发起争辩帖。
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-[var(--text-muted)]">加载中...</p>
        </div>
      )}

      {/* Debates List */}
      {!loading && debates.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-[var(--text-muted)]">暂无争辩帖</p>
          {user && (
            <Link to="/debates/new" className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block">
              发起第一个争辩帖
            </Link>
          )}
        </Card>
      )}

      {!loading && debates.length > 0 && (
        <div className="space-y-4">
          {debates.map(debate => {
            const isEnded = debate.status === 'resolved' || new Date(debate.expiresAt) < new Date();
            const totalVotes = debate.proVotes + debate.conVotes;
            const proPct = totalVotes > 0 ? Math.round((debate.proVotes / totalVotes) * 100) : 0;

            return (
              <Link key={debate.id} to={`/debates/${debate.id}`}>
                <Card className="p-4 hover:border-[var(--accent)] transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚖️</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">{debate.proposition}</h3>
                        {isEnded && (
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                            {debate.winner ? (debate.winner === 'pro' ? '支持方胜' : '反对方胜') : '已结束'}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <span>支持 {debate.proVotes} vs 反对 {debate.conVotes}</span>
                        <span>截止：{new Date(debate.expiresAt).toLocaleDateString()}</span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="mt-2 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${proPct}%` }}
                        />
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${100 - proPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}