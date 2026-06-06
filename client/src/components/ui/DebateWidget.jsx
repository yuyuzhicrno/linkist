import { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';

export default function DebateWidget({ debate: initialDebate }) {
  const { user } = useAuth();
  const [debate, setDebate] = useState(initialDebate);
  const [argumentsList, setArgumentsList] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showArgumentForm, setShowArgumentForm] = useState(false);
  const [argumentForm, setArgumentForm] = useState({ side: 'pro', content: '' });

  useEffect(() => {
    if (debate) {
      loadArguments();
      loadMyVote();
    }
  }, [debate?.id]);

  const loadArguments = async () => {
    try {
      const args = await api.getDebateArguments(debate.id);
      setArgumentsList(args || []);
    } catch (err) {
      console.error('加载论点失败:', err);
    }
  };

  const loadMyVote = async () => {
    if (!user) return;
    try {
      const vote = await api.getDebateVote(debate.id);
      setMyVote(vote);
    } catch (err) {
      console.error('加载投票状态失败:', err);
    }
  };

  if (!debate) return null;

  const isEnded = debate.status === 'resolved' || new Date(debate.expiresAt) < new Date();
  const totalVotes = debate.proVotes + debate.conVotes;
  const proPct = totalVotes > 0 ? Math.round((debate.proVotes / totalVotes) * 100) : 0;
  const conPct = totalVotes > 0 ? Math.round((debate.conVotes / totalVotes) * 100) : 0;

  const handleVote = async (side) => {
    if (!user || isEnded) return;
    setLoading(true);
    try {
      const updated = await api.voteDebate(debate.id, side);
      setDebate(updated);
      await loadMyVote();
    } catch (err) {
      console.error('投票失败:', err);
    }
    setLoading(false);
  };

  const handleAddArgument = async () => {
    if (!user || !argumentForm.content.trim() || isEnded) return;
    setLoading(true);
    try {
      await api.addDebateArgument(debate.id, argumentForm);
      await loadArguments();
      setArgumentForm({ side: 'pro', content: '' });
      setShowArgumentForm(false);
    } catch (err) {
      console.error('添加论点失败:', err);
    }
    setLoading(false);
  };

  const handleResolve = async () => {
    if (!user || debate.authorId !== user.id) return;
    setLoading(true);
    try {
      const resolved = await api.resolveDebate(debate.id);
      setDebate(resolved);
    } catch (err) {
      console.error('结束争辩失败:', err);
    }
    setLoading(false);
  };

  const proArguments = argumentsList.filter(a => a.side === 'pro');
  const conArguments = argumentsList.filter(a => a.side === 'con');

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 my-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⚖️</span>
        <h4 className="font-semibold text-[var(--text-primary)]">{debate.proposition}</h4>
        {isEnded && (
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] ml-auto">
            {debate.winner ? (debate.winner === 'pro' ? '支持方胜' : '反对方胜') : '已结束'}
          </span>
        )}
        {!isEnded && (
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            截止：{new Date(debate.expiresAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Vote Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            支持 {debate.proVotes} 票 ({proPct}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            反对 {debate.conVotes} 票 ({conPct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${proPct}%` }}
          />
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${conPct}%` }}
          />
        </div>
      </div>

      {/* Vote Buttons */}
      {!isEnded && user && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleVote('pro')}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              myVote?.side === 'pro'
                ? 'bg-green-500 text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-green-500/20'
            }`}
          >
            {myVote?.side === 'pro' ? '已支持 ✓' : '支持'}
          </button>
          <button
            onClick={() => handleVote('con')}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              myVote?.side === 'con'
                ? 'bg-red-500 text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-red-500/20'
            }`}
          >
            {myVote?.side === 'con' ? '已反对 ✓' : '反对'}
          </button>
        </div>
      )}

      {/* Arguments Section */}
      <div className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-semibold text-[var(--text-primary)]">论点列表</h5>
          {!isEnded && user && (
            <button
              onClick={() => setShowArgumentForm(!showArgumentForm)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              {showArgumentForm ? '取消' : '添加论点'}
            </button>
          )}
        </div>

        {/* Argument Form */}
        {showArgumentForm && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--bg-tertiary)] space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setArgumentForm(f => ({ ...f, side: 'pro' }))}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  argumentForm.side === 'pro'
                    ? 'bg-green-500 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                }`}
              >
                支持
              </button>
              <button
                onClick={() => setArgumentForm(f => ({ ...f, side: 'con' }))}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  argumentForm.side === 'con'
                    ? 'bg-red-500 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                }`}
              >
                反对
              </button>
            </div>
            <textarea
              value={argumentForm.content}
              onChange={e => setArgumentForm(f => ({ ...f, content: e.target.value }))}
              placeholder="输入你的论点..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm resize-none"
            />
            <Button onClick={handleAddArgument} disabled={loading || !argumentForm.content.trim()}>
              {loading ? '提交中...' : '提交论点'}
            </Button>
          </div>
        )}

        {/* Arguments List */}
        {argumentsList.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">暂无论点</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Pro Arguments */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-green-500 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                支持方 ({proArguments.length})
              </div>
              {proArguments.map(arg => (
                <div key={arg.id} className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-[var(--text-primary)]">{arg.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                    <span>👍 {arg.upvotes?.length || 0}</span>
                    <span>👎 {arg.downvotes?.length || 0}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Con Arguments */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-red-500 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                反对方 ({conArguments.length})
              </div>
              {conArguments.map(arg => (
                <div key={arg.id} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-[var(--text-primary)]">{arg.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                    <span>👍 {arg.upvotes?.length || 0}</span>
                    <span>👎 {arg.downvotes?.length || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resolve Button */}
      {!isEnded && user && debate.authorId === user.id && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <Button
            onClick={handleResolve}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? '结束中...' : '结束争辩'}
          </Button>
        </div>
      )}

      {!user && !isEnded && (
        <p className="text-xs text-[var(--text-muted)] text-center mt-4">登录后参与投票和发表论点</p>
      )}
    </div>
  );
}