import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import { authAPI } from '../services/api';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const { login, getHomePath } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(getHomePath(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    try {
      await authAPI.forgotPassword(email);
      setForgotMsg('If the email exists, a reset link has been sent.');
    } catch {
      setForgotMsg('If the email exists, a reset link has been sent.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">V</div>
          <h1>Vastora CRM</h1>
          <p>Dealer network. One workspace.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {forgotMsg && <div className="alert alert-success">{forgotMsg}</div>}

        {!showForgot ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@vastora.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter password" />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" className="forgot-link" onClick={() => setShowForgot(true)}>
              Forgot Password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary login-btn">Send Reset Link</button>
            <button type="button" className="forgot-link" onClick={() => setShowForgot(false)}>
              Back to Login
            </button>
          </form>
        )}

        <div className="login-demo">
          <small>Super Admin: superadmin@vastora.com / super123</small><br />
          <small>Admin: admin@vastora.com / admin123</small><br />
          <small>Area Manager: rajesh@vastora.com / manager123</small><br />
          <small>Dealer: amit@vastora.com / dealer123</small>
        </div>
      </div>
    </div>
  );
};

export default Login;
