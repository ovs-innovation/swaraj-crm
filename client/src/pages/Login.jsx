import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Crown, Shield, Store, Users } from 'lucide-react';
import { useAuth } from '../shared/context/AuthContext';
import { useLang } from '../shared/context/LanguageContext';
import BrandLogo from '../shared/components/BrandLogo';
import LangSwitch from '../shared/components/LangSwitch';
import { getPortalRole, PORTAL_HINT, PORTAL_PATHS } from '../portal';
import './Login.css';

const ICONS = {
  super_admin: Crown,
  admin: Shield,
  area_manager: Users,
  dealer: Store,
};

const Login = () => {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, getHomePath, user, loading: authLoading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const roleId = getPortalRole();
  const Icon = ICONS[roleId] || Store;

  const enterWithCreds = async (e) => {
    e.preventDefault();
    if (busy || !roleId) return;
    setError('');
    setBusy(true);
    try {
      const loggedIn = await login(email.trim(), password, roleId);
      navigate(getHomePath(loggedIn.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('signInFail'));
    } finally {
      setBusy(false);
    }
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
          {roleId && <p className="login-port">{t(`roles.${roleId}`)}</p>}
        </aside>
        <div className="login-card">
          <div className="login-card-top">
            <BrandLogo size={44} />
            <LangSwitch />
          </div>
          {!roleId ? (
            <>
              <p className="login-choose">{t('chooseAccess')}</p>
              <p className="login-many">{t('loginPortalOnly')}</p>
              <div className="role-grid">
                {Object.keys(PORTAL_PATHS).map((id) => {
                  const Chip = ICONS[id];
                  return (
                    <Link key={id} to={PORTAL_PATHS[id]} className="role-chip">
                      <Chip size={18} />
                      <strong>{t(`roles.${id}`)}</strong>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <form className="login-fields" onSubmit={enterWithCreds}>
              <p className="login-choose">
                <Icon size={18} /> {t(`roles.${roleId}`)}
              </p>
              <p className="login-many">{t('loginPortalOnly')}</p>
              <p className="login-many">{PORTAL_HINT[roleId]}</p>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>{t('email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label>{t('loginPassword')}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
                {busy ? t('loading') : t('signIn')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
