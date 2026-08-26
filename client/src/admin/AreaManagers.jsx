import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { areaManagerAPI } from '../services/api';

const emptyForm = { employeeId: '', name: '', email: '', mobile: '', state: '', district: '', password: '' };

const AreaManagers = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const fetchManagers = () => {
    setLoading(true);
    areaManagerAPI.getAll({ search }).then((res) => setManagers(res.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchManagers(); }, [search]);

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
    setShowModal(true);
  };

  const handleToggle = async (id) => {
    await areaManagerAPI.toggleStatus(id);
    fetchManagers();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this area manager?')) return;
    try {
      await areaManagerAPI.delete(id);
      fetchManagers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Area Managers</h1>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditId(null); setForm(emptyForm); }}>
          <Plus size={18} /> Add Manager
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Search size={18} color="#64748b" />
          <input type="text" placeholder="Search by name, email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.875rem' }} />
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                    <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => handleEdit(m)}>Edit</button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleToggle(m._id)}>{m.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!managers.length && <p className="empty-state">No area managers found</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Edit' : 'Add'} Area Manager</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Employee ID</label><input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required disabled={!!editId} /></div>
                <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="form-group"><label>Mobile</label><input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>State</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required /></div>
                <div className="form-group"><label>District</label><input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required /></div>
              </div>
              {!editId && (
                <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
              )}
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

export default AreaManagers;
