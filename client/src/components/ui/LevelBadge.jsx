// LevelBadge - shows user level with color and XP progress
export default function LevelBadge({ levelInfo, showProgress = false, size = 'sm' }) {
  if (!levelInfo) return null;
  const { level, name, color, xp, nextXp } = levelInfo;
  const progress = nextXp ? Math.min(100, Math.round((xp / nextXp) * 100)) : 100;

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full font-bold ${sizeClasses[size]}`}
        style={{ background: color + '22', color, border: `1px solid ${color}55` }}
      >
        <span className="opacity-80">Lv.{level}</span>
        <span>{name}</span>
      </span>
      {showProgress && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: color }}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            {xp}{nextXp ? `/${nextXp}` : ''} XP
          </span>
        </div>
      )}
    </div>
  );
}
