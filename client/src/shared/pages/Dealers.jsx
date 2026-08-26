import { useEffect, useState } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dealerAPI, areaManagerAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  dealerName: '', dealerCode: '', contactPerson: '', mobile: '', alternateMobile: '',
  email: '', address: '', state: '', district: '', city: '', pincode: '',
  gstNumber: '', pan: '', facebookLink: '', whatsappNumber: '', preferredLanguage: 'Hindi', areaManager: '',
  loginEmail: '', loginPassword: '',
};

const Dealers = ({ basePath = '/admin' }) => {
  const { isAdmin, isAreaManager } = useAuth();
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

  const handleAssign = async () => {
    try {
      await dealerAPI.assign(showAssign, { areaManagerId: assignManager });
      setShowAssign(null);
      fetchDealers();
    } catch (err) {
      alert(err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleCreateLogin = async () => {
    try {
      await dealerAPI.createLogin(showLogin, loginForm);
      setShowLogin(null);
      setLoginForm({ loginEmail: '', loginPassword: '' });
      alert('Dealer login created successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create dealer login');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this dealer?')) return;
    await dealerAPI.delete(id);
    fetchDealers();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isAdmin ? 'Dealers' : 'My Dealers'}</h1>
          <p className="page-subtitle">
            {isAdmin ? 'Create, assign and manage dealers across all areas' : 'Create and manage dealers in your area'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditId(null); setForm(emptyForm); }}>
          <Plus size={18} /> Add Dealer
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder="Search dealers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>State</th>
                  <th>Area Manager</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                    <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <Link to={`${basePath}/dealers/${d._id}`} className="btn btn-sm btn-outline"><Eye size={14} /> View</Link>
                        <button className="btn btn-sm btn-outline" onClick={() => { setForm({ ...emptyForm, ...d, areaManager: d.areaManager?._id || '' }); setEditId(d._id); setShowModal(true); }}>Edit</button>
                        {isAdmin && <button className="btn btn-sm btn-outline" onClick={() => { setShowAssign(d._id); setAssignManager(d.areaManager?._id || ''); }}>Assign</button>}
                        <button className="btn btn-sm btn-outline" onClick={() => { setShowLogin(d._id); setLoginForm({ loginEmail: d.email || '', loginPassword: '' }); }}>Create Login</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!dealers.length && <p className="empty-state">No dealers found</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <h2>{editId ? 'Edit' : 'Add'} Dealer</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Dealer Name</label><input value={form.dealerName} onChange={(e) => setForm({ ...form, dealerName: e.target.value })} required /></div>
                <div className="form-group"><label>Dealer Code</label><input value={form.dealerCode} onChange={(e) => setForm({ ...form, dealerCode: e.target.value })} required disabled={!!editId} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Contact Person</label><input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} required /></div>
                <div className="form-group"><label>Mobile</label><input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>State</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required /></div>
                <div className="form-group"><label>District</label><input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              {isAdmin && !editId && (
                <div className="form-group">
                  <label>Area Manager</label>
                  <select value={form.areaManager} onChange={(e) => setForm({ ...form, areaManager: e.target.value })}>
                    <option value="">Select Manager</option>
                    {managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              {isAreaManager && !editId && (
                <p className="hint">This dealer will be assigned to you automatically.</p>
              )}
              {!editId && (
                <div className="form-row">
                  <div className="form-group"><label>Dealer Login Email</label><input type="email" value={form.loginEmail} onChange={(e) => setForm({ ...form, loginEmail: e.target.value })} placeholder="dealer@vastora.com" /></div>
                  <div className="form-group"><label>Dealer Login Password</label><input type="password" value={form.loginPassword} onChange={(e) => setForm({ ...form, loginPassword: e.target.value })} placeholder="Optional" /></div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Assign Dealer</h2>
            <div className="form-group">
              <label>Area Manager</label>
              <select value={assignManager} onChange={(e) => setAssignManager(e.target.value)}>
                <option value="">Select Manager</option>
                {managers.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.state})</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowAssign(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Dealer Login</h2>
            <div className="form-group">
              <label>Login Email</label>
              <input type="email" value={loginForm.loginEmail} onChange={(e) => setLoginForm({ ...loginForm, loginEmail: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={loginForm.loginPassword} onChange={(e) => setLoginForm({ ...loginForm, loginPassword: e.target.value })} required />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowLogin(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateLogin}>Create Login</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dealers;
