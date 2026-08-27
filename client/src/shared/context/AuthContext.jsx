import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { authAPI, AUTH_TOKEN_KEY, AUTH_USER_KEY, clearAuthStorage } from '../../services/api';

const AuthContext = createContext(null);

export const getHomePath = (role) => {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'admin') return '/admin';
  if (role === 'area_manager') return '/area-manager';
  if (role === 'dealer') return '/dealer';
  return '/login';
};

const normalizeUser = (raw) => {
  if (!raw) return null;
  if (!raw.role) return null;
  return {
    id: String(raw.id || raw._id),
    name: raw.name,
    email: raw.email,
    role: raw.role,
    status: raw.status,
    areaManagerRef: raw.areaManagerRef || null,
    dealerRef: raw.dealerRef || null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token');
    if (!token) {
      clearAuthStorage();
      setUser(null);
      setLoading(false);
      return;
    }

    authAPI
      .getMe()
      .then((res) => {
        const next = normalizeUser(res.data.user);
        if (!next) {
          clearAuthStorage();
          setUser(null);
          return;
        }
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
        setUser(next);
      })
      .catch(() => {
        clearAuthStorage();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, role) => {
    clearAuthStorage();
    setUser(null);
    const res = await authAPI.login({ email, password, role });
    const next = normalizeUser(res.data.user);
    if (!next) throw new Error('Invalid login response');
    localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
    setUser(next);
    return next;
  };

  const logout = () => {
    clearAuthStorage();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      loading,
      getHomePath,
      isSuperAdmin: user?.role === 'super_admin',
      isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
      isHqAdmin: user?.role === 'admin',
      isAreaManager: user?.role === 'area_manager',
      isDealer: user?.role === 'dealer',
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
