import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';

const ThemeContext = createContext(null);

const ACCENTS = [
  { name: '紫罗兰', value: '#7c3aed', light: '#a78bfa' },
  { name: '天青', value: '#0ea5e9', light: '#38bdf8' },
  { name: '珊瑚', value: '#ef4444', light: '#f87171' },
  { name: '翡翠', value: '#10b981', light: '#34d399' },
  { name: '琥珀', value: '#f59e0b', light: '#fbbf24' },
  { name: '玫瑰', value: '#ec4899', light: '#f472b6' },
  { name: '青柠', value: '#84cc16', light: '#a3e635' },
  { name: '橙焰', value: '#f97316', light: '#fb923c' },
];

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('linkist_theme') || 'dark';
  });
  const [accentColor, setAccentState] = useState(() => {
    return localStorage.getItem('linkist_accent') || '#7c3aed';
  });
  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem('linkist_font') || 'base';
  });

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('linkist_theme', theme);
  }, [theme]);

  // Apply accent
  useEffect(() => {
    const accent = ACCENTS.find(a => a.value === accentColor) || ACCENTS[0];
    const root = document.documentElement;
    root.style.setProperty('--accent', accent.value);
    root.style.setProperty('--accent-light', accent.light);
    const hex = accent.value.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    localStorage.setItem('linkist_accent', accentColor);
  }, [accentColor]);

  // Apply font size
  useEffect(() => {
    const sizes = { sm: '14px', base: '16px', lg: '18px' };
    document.documentElement.style.fontSize = sizes[fontSize] || '16px';
    localStorage.setItem('linkist_font', fontSize);
  }, [fontSize]);

  // Sync from user settings when user logs in
  useEffect(() => {
    if (user) {
      if (user.theme) setThemeState(user.theme);
      if (user.accentColor) setAccentState(user.accentColor);
      if (user.uiSettings?.fontSize) setFontSizeState(user.uiSettings.fontSize);
    }
  }, [user?.id]);

  const setTheme = (t) => {
    setThemeState(t);
    if (user) updateUser({ theme: t });
  };
  const setAccent = (a) => {
    setAccentState(a);
    if (user) updateUser({ accentColor: a });
  };
  const setFontSize = (f) => {
    setFontSizeState(f);
    if (user) updateUser({ uiSettings: { fontSize: f } });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccent, fontSize, setFontSize, ACCENTS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
