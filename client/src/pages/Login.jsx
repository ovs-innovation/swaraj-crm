import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Shield, Store, Users } from 'lucide-react';
import { useAuth } from '../shared/context/AuthContext';
import { useLang } from '../shared/context/LanguageContext';
import BrandLogo from '../shared/components/BrandLogo';
import LangSwitch from '../shared/components/LangSwitch';
import './Login.css';

const HQ_ROLES = new Set(['super_admin', 'admin']);

const Login = () => {
  const [error, setError] = useState('');
  const [loadingRole, setLoadingRole] = useState('');
  const [pickedRole, setPickedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, getHomePath, user, loading: authLoading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const roles = [
    { id: 'super_admin', icon: Crown, email: 'superadmin@vastora.com', password: 'super123' },
    { id: 'admin', icon: Shield, email: 'admin@vastora.com', password: 'admin123' },
    { id: 'area_manager', icon: Users, email: 'rajesh@vastora.com', password: 'manager123' },
    { id: 'dealer', icon: Store, email: 'amit@vastora.com', password: 'dealer123' },
  ];

  const enterWithCreds = async (roleId, mail, pass) => {
    if (loadingRole) return;
    setError('');
    setLoadingRole(roleId);
    try {
      const loggedIn = await login(mail.trim(), pass, roleId);
      navigate(getHomePath(loggedIn.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t('signInFail'));
      setLoadingRole('');
    }
  };

  const pickRole = (picked) => {
    setError('');
    if (HQ_ROLES.has(picked.id)) {
      enterWithCreds(picked.id, picked.email, picked.password);
      return;
    }
    setPickedRole(picked);
    setEmail('');
    setPassword('');
  };

  const submitFieldLogin = (e) => {
    e.preventDefault();
    if (!pickedRole) return;
    enterWithCreds(pickedRole.id, email, password);
  };

  if (authLoading) return <div className="loading">{t('loading')}</div>;
  if (user) return <Navigate to={getHomePath(user.role)} replace />;

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-panel">
          <BrandLogo size={52} light />
          <h2>{t('mera')}</h2>
          <p>{t('loginTag')}</p>
        </aside>
        <div className="login-card">
          <div className="login-card-top">
            <BrandLogo size={44} />
            <LangSwitch />
          </div>
          {!pickedRole ? (
            <>
              <p className="login-choose">{t('chooseAccess')}</p>
              <p className="login-many">{t('loginMany')}</p>
              <p style={{ margin: '-0.35rem 0 1rem' }}>
                <a href="/Swaraj-CRM-User-Guide.html" target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', fontWeight: 650, color: '#0078D4' }}>
                  {t('nav.guide')}
                </a>
              </p>
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
                      onClick={() => pickRole(picked)}
                    >
                      <Icon size={18} />
                      <strong>{t(`roles.${picked.id}`)}</strong>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <form className="login-fields" onSubmit={submitFieldLogin}>
              <button
                type="button"
                className="login-back"
                onClick={() => { setPickedRole(null); setError(''); setLoadingRole(''); }}
              >
                <ArrowLeft size={16} /> {t('loginBack')}
              </button>
              <p className="login-choose">{t(`roles.${pickedRole.id}`)}</p>
              <p className="login-many">{t('loginOwnAccount')}</p>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>{t('email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label>{t('loginPassword')}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={!!loadingRole} style={{ width: '100%', justifyContent: 'center' }}>
                {loadingRole ? t('loading') : t('signIn')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
