import { useEffect, useState } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
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

const Dealers = ({ basePath = '/admin' }) => {
  const { isAdmin, isAreaManager } = useAuth();
  const { t } = useLang();
  const [dealers, setDealers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) await dealerAPI.update(editId, form);
      else await dealerAPI.create(form);
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
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditId(null); setForm(emptyForm); }}>
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
                  <th>{t('actions')}</th>
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
                      <td>
                      <div className="row-actions">
                        <Link to={`${basePath}/dealers/${d._id}`} className="btn btn-sm btn-outline"><Eye size={14} /> {t('view')}</Link>
                        <button className="btn btn-sm btn-outline" onClick={() => { setForm({ ...emptyForm, ...d, areaManager: d.areaManager?._id || '' }); setEditId(d._id); setShowModal(true); }}>{t('edit')}</button>
                        {isAdmin && <button className="btn btn-sm btn-outline" onClick={() => { setShowAssign(d._id); setAssignManager(d.areaManager?._id || ''); }}>{t('dealers.assign')}</button>}
                        <button className="btn btn-sm btn-outline" onClick={() => { setShowLogin(d._id); setLoginForm({ loginEmail: d.email || '', loginPassword: '' }); }}>{t('dealers.createLogin')}</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d._id)}>{t('delete')}</button>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <h2>{editId ? t('dealers.editTitle') : t('dealers.addTitle')}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>{t('dealers.dealerName')}</label><input value={form.dealerName} onChange={(e) => setForm({ ...form, dealerName: e.target.value })} required /></div>
                <div className="form-group"><label>{t('dealers.dealerCode')}</label><input value={form.dealerCode} onChange={(e) => setForm({ ...form, dealerCode: e.target.value })} required disabled={!!editId} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>{t('dealers.contactPerson')}</label><input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} required /></div>
                <div className="form-group"><label>{t('mobile')}</label><input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>{t('dealers.state')}</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required /></div>
                <div className="form-group"><label>{t('dealers.district')}</label><input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>{t('dealers.city')}</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="form-group"><label>{t('email')}</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
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
                  <div className="form-group"><label>{t('dealers.loginEmail')}</label><input type="email" value={form.loginEmail} onChange={(e) => setForm({ ...form, loginEmail: e.target.value })} /></div>
                  <div className="form-group"><label>{t('dealers.loginPassword')}</label><input type="password" value={form.loginPassword} onChange={(e) => setForm({ ...form, loginPassword: e.target.value })} /></div>
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
        <div className="modal-overlay" onClick={() => setShowAssign(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('dealers.assignTitle')}</h2>
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
        <div className="modal-overlay" onClick={() => setShowLogin(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('dealers.loginTitle')}</h2>
            <div className="form-group">
              <label>{t('email')}</label>
              <input type="email" value={loginForm.loginEmail} onChange={(e) => setLoginForm({ ...loginForm, loginEmail: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{t('dealers.password')}</label>
              <input type="password" value={loginForm.loginPassword} onChange={(e) => setLoginForm({ ...loginForm, loginPassword: e.target.value })} required />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowLogin(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleCreateLogin}>{t('dealers.createLogin')}</button>
            </div>
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
