export const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

export const getAvatar = (user) => {
  if (!user) return null;
  if (user.avatar) return user.avatar;
  // Generate initials avatar color
  const colors = ['#7c3aed', '#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#f97316'];
  const color = colors[(user.username?.charCodeAt(0) || 0) % colors.length];
  return { initials: (user.username || '?').slice(0, 2).toUpperCase(), color };
};

export const clsx = (...classes) => classes.filter(Boolean).join(' ');
