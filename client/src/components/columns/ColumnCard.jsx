import { Link } from 'react-router-dom';
import { Card } from '../ui/Card.jsx';
import { Avatar } from '../ui/Avatar.jsx';

export function ColumnCard({ col }) {
  return (
    <Link to={`/columns/${col.id}`}>
      <Card hover className="overflow-hidden">
        <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${col.coverColor}30, ${col.coverColor}10)` }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl text-white font-bold shadow-lg" style={{ background: col.coverColor }}>
              {col.title[0]}
            </div>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">{col.title}</h3>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{col.description}</p>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <Avatar user={col.author} size="xs" />
              {col.author?.username}
            </div>
            <div className="flex items-center gap-3">
              <span>📝 {col.articleCount}</span>
              <span>★ {col.followers?.length || 0}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}