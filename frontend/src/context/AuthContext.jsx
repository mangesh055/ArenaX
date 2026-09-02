import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('clerk-token') || localStorage.getItem('mock-token'));

  const fetchUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('clerk-token');
      localStorage.removeItem('mock-token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const login = (mockToken) => {
    localStorage.setItem('mock-token', mockToken);
    setToken(mockToken);
  };

  const logout = () => {
    localStorage.removeItem('clerk-token');
    localStorage.removeItem('mock-token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = () => fetchUser();

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
