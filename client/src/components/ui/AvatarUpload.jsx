import { useRef, useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function AvatarUpload({ currentAvatar, username, size = 80, onUploaded }) {
  const { updateUser } = useAuth();
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('只支持图片文件'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('图片不能超过 2MB'); return; }
    setError('');
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      try {
        const updated = await api.uploadAvatar(dataUrl);
        if (updated.error) { setError(updated.error); }
        else { updateUser && updateUser(updated); onUploaded && onUploaded(updated); }
      } catch { setError('上传失败，请重试'); }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const initials = username ? username.slice(0, 2).toUpperCase() : '??';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative group rounded-full overflow-hidden border-2 border-[var(--accent)] hover:border-[var(--accent-light)] transition-all"
        style={{ width: size, height: size }}
        disabled={loading}
      >
        {currentAvatar ? (
          <img src={currentAvatar} alt={username} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{ fontSize: size * 0.3, background: 'var(--accent)' }}
          >
            {initials}
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-[var(--text-muted)]">点击更换头像</p>
    </div>
  );
}
