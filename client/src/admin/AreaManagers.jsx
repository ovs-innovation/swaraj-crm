import { useEffect, useState } from 'react';
import { Plus, Search, Eye, EyeOff, X } from 'lucide-react';
import { areaManagerAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';
import ConfirmDialog from '../shared/components/ConfirmDialog';

const emptyForm = { employeeId: '', name: '', email: '', mobile: '', state: '', district: '', password: '' };

const getNextEmployeeId = (list) => {
  let max = 0;
  (list || []).forEach((m) => {
    const match = String(m.employeeId || '').match(/(\d+)/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val > max) max = val;
    }
  });
  const next = max + 1;
  return `TM${String(next).padStart(3, '0')}`;
};

const AreaManagers = () => {
  const { t } = useLang();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState(null);

  const fetchManagers = () => {
    setLoading(true);
    areaManagerAPI.getAll({ search }).then((res) => setManagers(res.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchManagers(); }, [search]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleOpenAdd = () => {
    setEditId(null);
    setError('');
    setShowPassword(false);
    setForm({
      ...emptyForm,
      employeeId: getNextEmployeeId(managers),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        const { password, ...data } = form;
        await areaManagerAPI.update(editId, data);
      } else {
        await areaManagerAPI.create(form);
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditId(null);
      fetchManagers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (m) => {
    setForm({ employeeId: m.employeeId, name: m.name, email: m.email, mobile: m.mobile, state: m.state, district: m.district, password: '' });
    setEditId(m._id);
    setShowPassword(false);
    setError('');
    setShowModal(true);
  };

  const handleToggle = async (id) => {
    await areaManagerAPI.toggleStatus(id);
    fetchManagers();
  };

  const handleDelete = (id) => {
    setAsk({
      title: t('delete'),
      message: t('am.confirmDelete'),
      run: async () => {
        try {
          await areaManagerAPI.delete(id);
          fetchManagers();
        } catch (err) {
          alert(err.response?.data?.message || 'Delete failed');
        } finally {
          setAsk(null);
        }
      },
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('am.title')}</h1>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> {t('am.add')}
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Search size={18} color="#64748b" />
          <input type="text" placeholder={t('am.search')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.875rem' }} />
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading">{t('loading')}</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('am.empId')}</th>
                  <th>{t('name')}</th>
                  <th>{t('email')}</th>
                  <th>{t('mobile')}</th>
                  <th>{t('dealers.state')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((m) => (
                  <tr key={m._id}>
                    <td>{m.employeeId}</td>
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.mobile}</td>
                    <td>{m.state}</td>
                    <td><span className={`badge badge-${m.status}`}>{t(m.status)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => handleEdit(m)}>{t('edit')}</button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleToggle(m._id)}>{m.status === 'active' ? t('users.deactivate') : t('users.activate')}</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m._id)}>{t('delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!managers.length && <p className="empty-state">{t('noData')}</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? t('am.editTitle') : t('am.addTitle')}</h2>
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
                  <label>{t('am.empId')}</label>
                  <input
                    name="tm_employee_id"
                    autoComplete="off"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    required
                    disabled={!!editId}
                    placeholder="e.g. TM001"
                  />
                </div>
                <div className="form-group">
                  <label>{t('name')}</label>
                  <input
                    name="tm_name"
                    autoComplete="off"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('email')}</label>
                  <input
                    type="email"
                    name="tm_email"
                    autoComplete="off"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('mobile')}</label>
                  <input
                    name="tm_mobile"
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
                    name="tm_state"
                    autoComplete="off"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('dealers.district')}</label>
                  <input
                    name="tm_district"
                    autoComplete="off"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    required
                  />
                </div>
              </div>
              {!editId && (
                <div className="form-group">
                  <label>{t('am.password')}</label>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="tm_password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      placeholder="Set password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
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
      <ConfirmDialog
        open={!!ask}
        title={ask?.title}
        message={ask?.message}
        danger
        onClose={() => setAsk(null)}
        onConfirm={() => ask?.run?.()}
      />
    </div>
  );
};

export default AreaManagers;
