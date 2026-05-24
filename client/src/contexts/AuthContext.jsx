import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      api.get('/auth/me', token)
        .then(data => { if (!data.error) setUser(data); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    if (data.error) throw new Error(data.error);
    localStorage.setItem('nexus_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password) => {
    const data = await api.post('/auth/register', { username, email, password });
    if (data.error) throw new Error(data.error);
    localStorage.setItem('nexus_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('nexus_token');
    setUser(null);
  };

  const updateUser = (updates) => {
    const token = localStorage.getItem('nexus_token');
    return api.put('/users/me', updates, token).then(data => {
      if (!data.error) setUser(data);
      return data;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
