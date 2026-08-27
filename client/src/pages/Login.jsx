import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Crown, Shield, Users, Store } from 'lucide-react';
import { useAuth } from '../shared/context/AuthContext';
import './Login.css';

const roles = [
  { id: 'super_admin', label: 'Super Admin', icon: Crown, email: 'superadmin@vastora.com', password: 'super123' },
  { id: 'admin', label: 'Admin', icon: Shield, email: 'admin@vastora.com', password: 'admin123' },
  { id: 'area_manager', label: 'Area Manager', icon: Users, email: 'rajesh@vastora.com', password: 'manager123' },
  { id: 'dealer', label: 'Dealer', icon: Store, email: 'amit@vastora.com', password: 'dealer123' },
];

const Login = () => {
  const [error, setError] = useState('');
  const [loadingRole, setLoadingRole] = useState('');
  const { login, getHomePath, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const enterRole = async (picked) => {
    if (loadingRole) return;
    setError('');
    setLoadingRole(picked.id);
    try {
      const loggedIn = await login(picked.email, picked.password, picked.id);
      navigate(getHomePath(loggedIn.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open this dashboard');
      setLoadingRole('');
    }
  };

  if (authLoading) return <div className="loading">Loading...</div>;
  if (user) return <Navigate to={getHomePath(user.role)} replace />;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">V</div>
          <h1>Vastora CRM</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="role-grid">
          {roles.map((picked) => {
            const Icon = picked.icon;
            const busy = loadingRole === picked.id;
            return (
              <button
                key={picked.id}
                type="button"
                className={`role-chip ${busy ? 'active' : ''}`}
                disabled={!!loadingRole}
                onClick={() => enterRole(picked)}
              >
                <Icon size={20} />
                <span>
                  <strong>{picked.label}</strong>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Login;
