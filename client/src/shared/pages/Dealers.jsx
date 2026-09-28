import { useEffect, useState } from 'react';
import { Plus, Search, Eye, EyeOff, X, Pencil, UserCheck, Key, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dealerAPI, areaManagerAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import ConfirmDialog from '../components/ConfirmDialog';

const emptyForm = {
  dealerName: '', dealerCode: '', contactPerson: '', mobile: '', alternateMobile: '',
  email: '', address: '', state: '', district: '', city: '', pincode: '',
  gstNumber: '', pan: '', facebookLink: '', whatsappNumber: '', preferredLanguage: 'Hindi', areaManager: '',
  loginEmail: '', loginPassword: '',
};

const getNextDealerCode = (list) => {
  let max = 0;
  (list || []).forEach((d) => {
    const match = String(d.dealerCode || '').match(/(\d+)/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val > max) max = val;
    }
  });
  const next = max + 1;
  return `DLR${String(next).padStart(3, '0')}`;
};

const Dealers = ({ basePath = '/admin' }) => {
  const { isAdmin, isAreaManager } = useAuth();
  const { t } = useLang();
  const [dealers, setDealers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDealerPassword, setShowDealerPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showAssign, setShowAssign] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [assignManager, setAssignManager] = useState('');
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(null);
  const [loginForm, setLoginForm] = useState({ loginEmail: '', loginPassword: '' });
  const [ask, setAsk] = useState(null);

  const fetchDealers = () => {
    setLoading(true);
    dealerAPI.getAll({ search }).then((res) => setDealers(res.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDealers();
    if (isAdmin) areaManagerAPI.getAll({ limit: 100 }).then((res) => setManagers(res.data.data));
  }, [search, isAdmin]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false);
        if (showAssign) setShowAssign(null);
        if (showLogin) setShowLogin(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, showAssign, showLogin]);

  const handleOpenAdd = () => {
    setEditId(null);
    setError('');
    setShowDealerPassword(false);
    setForm({
      ...emptyForm,
      dealerCode: getNextDealerCode(dealers),
    });
    setShowModal(true);
  };

  const handleEdit = (d) => {
    setForm({ ...emptyForm, ...d, areaManager: d.areaManager?._id || '' });
    setEditId(d._id);
    setShowDealerPassword(false);
    setError('');
    setShowModal(true);
  };

  const handleOpenCreateLogin = (d) => {
    setShowLogin(d._id);
    setShowLoginPassword(false);
    setLoginForm({ loginEmail: d.email || '', loginPassword: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (payload.loginPassword && !payload.loginEmail && payload.email) {
        payload.loginEmail = payload.email;
      }
      if (editId) await dealerAPI.update(editId, payload);
      else await dealerAPI.create(payload);
      setShowModal(false);
      setForm(emptyForm);
      setEditId(null);
      fetchDealers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleAssign = () => {
    setAsk({
      title: t('dealers.assign'),
      message: t('dealers.confirmAssign'),
      run: async () => {
        try {
          await dealerAPI.assign(showAssign, { areaManagerId: assignManager });
          setShowAssign(null);
          fetchDealers();
        } catch (err) {
          alert(err.response?.data?.message || 'Assignment failed');
        } finally {
          setAsk(null);
        }
      },
    });
  };

  const handleCreateLogin = async () => {
    try {
      await dealerAPI.createLogin(showLogin, loginForm);
      setShowLogin(null);
      setLoginForm({ loginEmail: '', loginPassword: '' });
      alert(t('dealers.loginOk'));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create dealer login');
    }
  };

  const handleDelete = (id) => {
    setAsk({
      title: t('delete'),
      message: t('dealers.confirmDelete'),
      danger: true,
      run: async () => {
        await dealerAPI.delete(id);
        fetchDealers();
        setAsk(null);
      },
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isAdmin ? t('dealers.title') : t('dealers.mine')}</h1>
          <p className="page-subtitle">{isAdmin ? t('dealers.subAll') : t('dealers.subMine')}</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> {t('dealers.add')}
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder={t('dealers.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {loading ? <div className="loading">{t('loading')}</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('dealers.code')}</th>
                  <th>{t('name')}</th>
                  <th>{t('dealers.contact')}</th>
                  <th>{t('dealers.state')}</th>
                  <th>{t('dealers.am')}</th>
                  <th>{t('status')}</th>
                  <th style={{ width: '220px', minWidth: '220px' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((d) => (
                  <tr key={d._id}>
                    <td><span className="code-chip">{d.dealerCode}</span></td>
                    <td><strong>{d.dealerName}</strong></td>
                    <td>{d.contactPerson}<br /><small className="muted">{d.mobile}</small></td>
                    <td>{d.state}</td>
                    <td>{d.areaManager?.name || '—'}</td>
                    <td><span className={`badge badge-${d.status}`}>{t(d.status)}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="dealer-row-actions">
                        <Link
                          to={`${basePath}/dealers/${d._id}`}
                          className="dealer-action-btn view-btn"
                          title={t('view')}
                        >
                          <Eye size={14} /> <span>{t('view')}</span>
                        </Link>
                        <button
                          type="button"
                          className="dealer-icon-btn edit-btn"
                          onClick={() => handleEdit(d)}
                          title={t('edit')}
                          aria-label={t('edit')}
                        >
                          <Pencil size={15} />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="dealer-icon-btn assign-btn"
                            onClick={() => { setShowAssign(d._id); setAssignManager(d.areaManager?._id || ''); }}
                            title={t('dealers.assign')}
                            aria-label={t('dealers.assign')}
                          >
                            <UserCheck size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="dealer-icon-btn login-btn"
                          onClick={() => handleOpenCreateLogin(d)}
                          title={t('dealers.createLogin')}
                          aria-label={t('dealers.createLogin')}
                        >
                          <Key size={15} />
                        </button>
                        <button
                          type="button"
                          className="dealer-icon-btn delete-btn"
                          onClick={() => handleDelete(d._id)}
                          title={t('delete')}
                          aria-label={t('delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!dealers.length && <p className="empty-state">{t('noData')}</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>{editId ? t('dealers.editTitle') : t('dealers.addTitle')}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('dealers.dealerName')}</label>
                  <input
                    name="dealer_name"
                    autoComplete="off"
                    value={form.dealerName}
                    onChange={(e) => setForm({ ...form, dealerName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('dealers.dealerCode')}</label>
                  <input
                    name="new_dealer_code"
                    autoComplete="off"
                    value={form.dealerCode}
                    onChange={(e) => setForm({ ...form, dealerCode: e.target.value })}
                    required
                    disabled={!!editId}
                    placeholder="e.g. DLR001"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('dealers.contactPerson')}</label>
                  <input
                    name="dealer_contact_person"
                    autoComplete="off"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('mobile')}</label>
                  <input
                    name="dealer_mobile"
                    autoComplete="off"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('dealers.state')}</label>
                  <input
                    name="dealer_state"
                    autoComplete="off"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('dealers.district')}</label>
                  <input
                    name="dealer_district"
                    autoComplete="off"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('dealers.city')}</label>
                  <input
                    name="dealer_city"
                    autoComplete="off"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('email')}</label>
                  <input
                    type="email"
                    name="dealer_contact_email"
                    autoComplete="off"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              {isAdmin && !editId && (
                <div className="form-group">
                  <label>{t('dealers.am')}</label>
                  <select value={form.areaManager} onChange={(e) => setForm({ ...form, areaManager: e.target.value })}>
                    <option value="">{t('dealers.selectAm')}</option>
                    {managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              {isAreaManager && !editId && (
                <p className="hint">{t('dealers.autoAssign')}</p>
              )}
              {!editId && (
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('dealers.loginEmail')}</label>
                    <input
                      type="email"
                      name="dealer_login_email"
                      autoComplete="off"
                      value={form.loginEmail}
                      onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
                      placeholder={form.email ? `Same as: ${form.email}` : 'dealer@example.com'}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('dealers.loginPassword')}</label>
                    <div className="password-input-wrap">
                      <input
                        type={showDealerPassword ? 'text' : 'password'}
                        name="dealer_login_pwd"
                        autoComplete="new-password"
                        value={form.loginPassword}
                        onChange={(e) => setForm({ ...form, loginPassword: e.target.value })}
                        placeholder="Set login password"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowDealerPassword(!showDealerPassword)}
                        title={showDealerPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showDealerPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{editId ? t('update') : t('create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssign && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{t('dealers.assignTitle')}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAssign(null)}
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
            <div className="form-group">
              <label>{t('dealers.am')}</label>
              <select value={assignManager} onChange={(e) => setAssignManager(e.target.value)}>
                <option value="">{t('dealers.selectAm')}</option>
                {managers.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.state})</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowAssign(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleAssign}>{t('dealers.assign')}</button>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{t('dealers.loginTitle')}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowLogin(null)}
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateLogin(); }} autoComplete="off">
              <div className="form-group">
                <label>{t('email')}</label>
                <input
                  type="email"
                  name="create_login_email"
                  autoComplete="off"
                  value={loginForm.loginEmail}
                  onChange={(e) => setLoginForm({ ...loginForm, loginEmail: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('dealers.password')}</label>
                <div className="password-input-wrap">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    name="create_login_pwd"
                    autoComplete="new-password"
                    value={loginForm.loginPassword}
                    onChange={(e) => setLoginForm({ ...loginForm, loginPassword: e.target.value })}
                    required
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowLogin(null)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('dealers.createLogin')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!ask}
        title={ask?.title}
        message={ask?.message}
        danger={ask?.danger}
        onClose={() => setAsk(null)}
        onConfirm={() => ask?.run?.()}
      />
    </div>
  );
};

export default Dealers;
