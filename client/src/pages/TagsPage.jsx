import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../utils/api.js';

function TagCloud({ tags, selectedTag, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(t => (
        <button
          key={t.name}
          onClick={() => onSelect(t.name === selectedTag ? null : t.name)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all"
          style={{
            background: t.name === selectedTag ? t.color : t.color + '22',
            color: t.name === selectedTag ? '#fff' : t.color,
            border: `1px solid ${t.color}44`,
            transform: t.name === selectedTag ? 'scale(1.05)' : 'scale(1)'
          }}
        >
          <span>{t.name}</span>
          <span className="opacity-70 text-xs">{t.count}</span>
        </button>
      ))}
    </div>
  );
}

export default function TagsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tags, setTags] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || null);
  const [content, setContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    api.getTags(searchQ).then(data => { if (Array.isArray(data)) setTags(data); });
  }, [searchQ]);

  useEffect(() => {
    const tag = searchParams.get('tag');
    if (tag) { setSelectedTag(tag); loadContent(tag); }
    else { setSelectedTag(null); setContent(null); }
  }, [searchParams]);

  const loadContent = async (tag) => {
    setLoadingContent(true);
    const data = await api.getTagContent(tag);
    setContent(data);
    setLoadingContent(false);
  };

  const handleSelect = (tag) => {
    if (tag) setSearchParams({ tag });
    else setSearchParams({});
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">🏷️ 标签</h1>
        <p className="text-[var(--text-secondary)]">浏览所有标签，发现感兴趣的内容</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="搜索标签..."
          className="input-base w-full pl-9 max-w-sm"
        />
      </div>

      {/* Tag Cloud */}
      <div className="card-base p-4 mb-6">
        {tags.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">没有找到标签</p>
        ) : (
          <TagCloud tags={tags} selectedTag={selectedTag} onSelect={handleSelect} />
        )}
      </div>

      {/* Tag Content */}
      {selectedTag && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              标签：<span style={{ color: tags.find(t => t.name === selectedTag)?.color || 'var(--accent)' }}>#{selectedTag}</span>
            </h2>
            {content && <span className="text-sm text-[var(--text-muted)]">共 {content.total} 条内容</span>}
            <button onClick={() => handleSelect(null)} className="ml-auto text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
              × 取消筛选
            </button>
          </div>

          {loadingContent ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : content?.items?.length === 0 ? (
            <div className="card-base p-8 text-center text-[var(--text-muted)]">暂无相关内容</div>
          ) : (
            <div className="space-y-3">
              {content?.items?.map(item => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.type === 'post' ? `/forum/${item.id}` : `/columns/${item.columnId}/articles/${item.id}`}
                  className="card-base p-4 block hover:border-[var(--accent)] transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{item.type === 'post' ? '💬' : '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-1.5 py-0.5 rounded-full text-[var(--text-muted)] bg-[var(--bg-tertiary)]">
                          {item.type === 'post' ? '帖子' : '专栏文章'}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">{formatTime(item.createdAt)}</span>
                      </div>
                      <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{item.summary}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                        {item.author && <span>by @{item.author.username}</span>}
                        {item.voteCount !== undefined && <span>▲ {item.voteCount}</span>}
                        {item.commentCount !== undefined && <span>💬 {item.commentCount}</span>}
                        {item.likes !== undefined && <span>❤️ {item.likes}</span>}
                        {item.readTime && <span>⏱ {item.readTime} min</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All tags stats */}
      {!selectedTag && tags.length > 0 && (
        <div className="mt-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">热门标签排行</h2>
          <div className="space-y-2">
            {tags.slice(0, 15).map((t, i) => (
              <button
                key={t.name}
                onClick={() => handleSelect(t.name)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-all text-left"
              >
                <span className="text-[var(--text-muted)] text-sm w-6 text-right">{i + 1}</span>
                <div
                  className="w-2 h-6 rounded-full"
                  style={{ background: t.color }}
                />
                <span className="flex-1 font-medium text-[var(--text-primary)]">{t.name}</span>
                <span className="text-sm text-[var(--text-muted)]">{t.count} 个内容</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
