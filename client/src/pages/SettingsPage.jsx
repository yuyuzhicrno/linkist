import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme, accentColor, setAccent, fontSize, setFontSize, ACCENTS } = useTheme();
  const [bio, setBio] = useState(user?.bio || '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return (
    <div className="max-w-lg mx-auto mt-16 text-center">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">请先登录</h2>
    </div>
  );

  const saveProfile = async () => {
    setSaving(true);
    await updateUser({ bio });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const TABS = ['个人资料', '外观', '账号'];
  const [activeTab, setActiveTab] = useState('外观');

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">设置</h1>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--border)]">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === '个人资料' && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <Avatar user={user} size="xl" />
            <div>
              <div className="font-semibold text-[var(--text-primary)]">{user.username}</div>
              <div className="text-sm text-[var(--text-muted)]">{user.email}</div>
            </div>
          </div>
          <Textarea
            label="个人简介"
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            placeholder="介绍一下自己..."
          />
          <Button onClick={saveProfile} disabled={saving}>
            {saving ? '保存中...' : saved ? '✓ 已保存' : '保存'}
          </Button>
        </Card>
      )}

      {activeTab === '外观' && (
        <div className="space-y-4">
          {/* Theme */}
          <Card className="p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">主题</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'dark', label: '深色模式', desc: '深邃暗夜', icon: '🌙',
                  preview: 'bg-gray-900 border-gray-700' },
                { key: 'light', label: '浅色模式', desc: '清新明亮', icon: '☀',
                  preview: 'bg-white border-gray-200' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    theme === t.key ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--accent)]/30'
                  }`}
                >
                  <div className={`w-full h-14 rounded-xl mb-3 border ${t.preview} flex items-end p-2 gap-1`}>
                    <div className={`w-1/3 h-2 rounded-full ${t.key === 'dark' ? 'bg-purple-500/60' : 'bg-purple-500/30'}`} />
                    <div className={`w-1/2 h-2 rounded-full ${t.key === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">{t.label}</div>
                      <div className="text-xs text-[var(--text-muted)]">{t.desc}</div>
                    </div>
                    {theme === t.key && <span className="ml-auto text-[var(--accent)] text-xs">当前</span>}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Accent Color */}
          <Card className="p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">主题色</h3>
            <div className="grid grid-cols-4 gap-3">
              {ACCENTS.map(a => (
                <button
                  key={a.value}
                  onClick={() => setAccent(a.value)}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    accentColor === a.value ? 'border-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--accent)]/30'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${a.value}, ${a.light})` }}
                  />
                  <span className="text-xs text-[var(--text-secondary)]">{a.name}</span>
                  {accentColor === a.value && <span className="text-xs text-[var(--accent)]">✓</span>}
                </button>
              ))}
            </div>
          </Card>

          {/* Font Size */}
          <Card className="p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">字号</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'sm', label: '小', sample: 'Aa', size: 'text-sm' },
                { key: 'base', label: '标准', sample: 'Aa', size: 'text-base' },
                { key: 'lg', label: '大', sample: 'Aa', size: 'text-lg' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFontSize(f.key)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                    fontSize === f.key ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--accent)]/30'
                  }`}
                >
                  <span className={`${f.size} font-semibold text-[var(--text-primary)]`}>{f.sample}</span>
                  <span className="text-xs text-[var(--text-muted)]">{f.label}</span>
                  {fontSize === f.key && <span className="text-xs text-[var(--accent)]">当前</span>}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === '账号' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--border)]">
            <div>
              <div className="font-medium text-[var(--text-primary)]">{user.username}</div>
              <div className="text-sm text-[var(--text-muted)]">{user.email}</div>
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              {user.role === 'admin' ? '管理员' : '成员'}
            </div>
          </div>
          <div className="border-t border-[var(--border)] pt-4">
            <h4 className="font-medium text-red-400 mb-2">危险操作</h4>
            <Button variant="danger" onClick={logout}>退出登录</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
