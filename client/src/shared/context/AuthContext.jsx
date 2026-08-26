import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../../services/api';

const AuthContext = createContext(null);

const getHomePath = (role) => {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'admin') return '/admin';
  if (role === 'area_manager') return '/area-manager';
  if (role === 'dealer') return '/dealer';
  return '/login';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI
        .getMe()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
