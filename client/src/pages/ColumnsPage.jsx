import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api.js';
import { Card, Skeleton } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ColumnCard } from '../components/columns/ColumnCard.jsx';
import { ColumnDetail } from '../components/columns/ColumnDetail.jsx';
import { ArticleDetail } from '../components/columns/ArticleDetail.jsx';

export default function ColumnsPage() {
  const { user } = useAuth();
  const { columnId, articleId } = useParams();
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCol, setNewCol] = useState({ title: '', description: '', coverColor: '#7c3aed' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get('/columns').then(data => {
      setColumns(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (articleId && columnId) return <ArticleDetail columnId={columnId} articleId={articleId} />;
  if (columnId) return <ColumnDetail id={columnId} user={user} />;

  const COLORS = ['#7c3aed', '#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#f97316', '#6366f1'];

  const createColumn = async () => {
    if (!newCol.title.trim()) return;
    setCreating(true);
    const data = await api.post('/columns', newCol);
    if (!data.error) {
      setColumns(c => [...c, { ...data, articleCount: 0 }]);
      setShowCreate(false);
      setNewCol({ title: '', description: '', coverColor: '#7c3aed' });
    }
    setCreating(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">专栏</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">深度文章，知识沉淀</p>
        </div>
        {user && (
          <Button onClick={() => setShowCreate(!showCreate)}>+ 创建专栏</Button>
        )}
      </div>

      {showCreate && (
        <Card className="p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">新建专栏</h3>
          <Input label="专栏名称" placeholder="给你的专栏起个名字" value={newCol.title} onChange={e => setNewCol(n => ({ ...n, title: e.target.value }))} />
          <Textarea label="简介" placeholder="介绍一下这个专栏..." value={newCol.description} onChange={e => setNewCol(n => ({ ...n, description: e.target.value }))} rows={2} />
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">封面颜色</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} style={{ background: c }} onClick={() => setNewCol(n => ({ ...n, coverColor: c }))}
                  className={`w-7 h-7 rounded-full transition-transform ${newCol.coverColor === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={createColumn} disabled={creating}>{creating ? '创建中...' : '创建专栏'}</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.map(col => <ColumnCard key={col.id} col={col} />)}
          {columns.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <div className="text-5xl mb-3">📚</div>
              <div className="text-[var(--text-muted)]">还没有专栏，来创建第一个！</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}