import { useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function PollWidget({ poll: initialPoll, onUpdate }) {
  const { user } = useAuth();
  const [poll, setPoll] = useState(initialPoll);
  const [selected, setSelected] = useState(new Set());
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
  const myVotes = poll.options.filter(o => user && o.votes.includes(user.id)).map(o => o.id);
  const hasVoted = voted || myVotes.length > 0;
  const isEnded = poll.endsAt && new Date(poll.endsAt) < new Date();

  const handleToggle = (id) => {
    if (hasVoted || isEnded) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (poll.allowMultiple) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else {
        next.clear(); next.add(id);
      }
      return next;
    });
  };

  const handleVote = async () => {
    if (!user || selected.size === 0) return;
    setLoading(true);
    const updated = await api.votePoll(poll.id, [...selected]);
    if (!updated.error) { setPoll(updated); setVoted(true); }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 my-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h4 className="font-semibold text-[var(--text-primary)]">{poll.question}</h4>
        {isEnded && <span className="text-xs text-[var(--text-muted)] ml-auto">已结束</span>}
        {poll.allowMultiple && !hasVoted && (
          <span className="text-xs text-[var(--text-muted)] ml-auto">可多选</span>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          const isMine = hasVoted ? (myVotes.includes(opt.id) || (voted && selected.has(opt.id))) : selected.has(opt.id);

          return (
            <button
              key={opt.id}
              onClick={() => handleToggle(opt.id)}
              disabled={hasVoted || isEnded}
              className="relative w-full text-left rounded-lg overflow-hidden border transition-all"
              style={{
                borderColor: isMine ? 'var(--accent)' : 'var(--border)',
                cursor: hasVoted || isEnded ? 'default' : 'pointer'
              }}
            >
              {/* Progress bar background */}
              {hasVoted && (
                <div
                  className="absolute inset-0 transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isMine ? 'var(--accent)22' : 'var(--bg-tertiary)'
                  }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  {!hasVoted && !isEnded && (
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: isMine ? 'var(--accent)' : 'var(--border)' }}
                    >
                      {isMine && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                    </div>
                  )}
                  {isMine && hasVoted && (
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-sm text-[var(--text-primary)]">{opt.text}</span>
                </div>
                {hasVoted && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>{opt.votes.length} 票</span>
                    <span className="font-bold" style={{ color: isMine ? 'var(--accent)' : undefined }}>{pct}%</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-[var(--text-muted)]">{totalVotes} 人参与投票</span>
        {!hasVoted && !isEnded && user && (
          <button
            onClick={handleVote}
            disabled={selected.size === 0 || loading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? '投票中...' : '确认投票'}
          </button>
        )}
        {!user && <span className="text-xs text-[var(--text-muted)]">登录后参与投票</span>}
      </div>
    </div>
  );
}
