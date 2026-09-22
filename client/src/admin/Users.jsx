import { useEffect, useState } from 'react';
import { Plus, Search, Crown } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { usersAPI } from '../services/api';
import { useAuth } from '../shared/context/AuthContext';
import { useLang } from '../shared/context/LanguageContext';
import ConfirmDialog from '../shared/components/ConfirmDialog';

const emptyForm = { name: '', email: '', password: '', role: 'admin' };

const Users = () => {
  const { isSuperAdmin } = useAuth();
  const { t } = useLang();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    usersAPI.getAll({ search }).then((res) => setUsers(res.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { if (isSuperAdmin) fetchUsers(); }, [search, isSuperAdmin]);

  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await usersAPI.update(editId, payload);
      } else {
        await usersAPI.create(form);
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditId(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleToggle = async (id) => {
    await usersAPI.toggleStatus(id);
    fetchUsers();
  };

  const handleDelete = (id) => {
    setAsk({
      title: t('delete'),
      message: t('users.confirmDelete'),
      run: async () => {
        try {
          await usersAPI.delete(id);
          fetchUsers();
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
        <div>
          <h1>{t('users.title')}</h1>
          <p className="page-subtitle">{t('users.sub')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditId(null); setForm(emptyForm); }}>
          <Plus size={18} /> {t('users.add')}
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder={t('users.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {loading ? <div className="loading">{t('loading')}</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('email')}</th>
                  <th>{t('users.role')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'super_admin' ? 'badge-super' : 'badge-active'}`}>
                        {u.role === 'super_admin' ? <><Crown size={12} /> {t('roles.super_admin')}</> : t('roles.admin')}
                      </span>
                    </td>
                    <td><span className={`badge badge-${u.status}`}>{t(u.status)}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditId(u._id); setShowModal(true); }}>{t('edit')}</button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleToggle(u._id)}>{u.status === 'active' ? t('users.deactivate') : t('users.activate')}</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u._id)}>{t('delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length && <p className="empty-state">{t('noData')}</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? t('users.editTitle') : t('users.addTitle')}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>{t('name')}</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label>{t('email')}</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div className="form-group">
                <label>{t('users.role')}</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">{t('roles.admin')}</option>
                  <option value="super_admin">{t('roles.super_admin')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{editId ? t('users.newPassword') : t('users.password')}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} minLength={6} />
              </div>
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

export default Users;
