import { useEffect, useState } from 'react';
import { Plus, Search, Crown } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { usersAPI } from '../services/api';
import { useAuth } from '../shared/context/AuthContext';

const emptyForm = { name: '', email: '', password: '', role: 'admin' };

const Users = () => {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

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

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await usersAPI.delete(id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>HQ Users</h1>
          <p className="page-subtitle">Create and manage Super Admins and Head Office Admins</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditId(null); setForm(emptyForm); }}>
          <Plus size={18} /> Add Admin
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                        {u.role === 'super_admin' ? <><Crown size={12} /> Super Admin</> : 'Admin'}
                      </span>
                    </td>
                    <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditId(u._id); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleToggle(u._id)}>{u.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length && <p className="empty-state">No HQ users found</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Edit' : 'Add'} HQ User</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Head Office Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>{editId ? 'New Password (optional)' : 'Password'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} minLength={6} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
