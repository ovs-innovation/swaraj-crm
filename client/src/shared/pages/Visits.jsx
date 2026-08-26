import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { visitAPI, dealerAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';

const Visits = ({ readOnly = false }) => {
  const { isAdmin, isDealer } = useAuth();
  const [visits, setVisits] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ dealer: '', visitDate: '', visitTime: '', notes: '', status: 'pending' });

  const fetchVisits = () => {
    setLoading(true);
    visitAPI.getAll().then((res) => setVisits(res.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVisits();
    dealerAPI.getAll({ limit: 100 }).then((res) => setDealers(res.data.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await visitAPI.create(form);
    setShowModal(false);
    setForm({ dealer: '', visitDate: '', visitTime: '', notes: '', status: 'pending' });
    fetchVisits();
  };

  const updateStatus = async (id, status) => {
    await visitAPI.update(id, { status });
    fetchVisits();
  };

  return (
    <div>
      <div className="page-header">
        <h1>{readOnly || isDealer ? 'Visit History' : 'Visits'}</h1>
        {!isAdmin && !readOnly && !isDealer && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Visit
          </button>
        )}
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Dealer</th>
                  <th>Area Manager</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v._id}>
                    <td>{v.dealer?.dealerName}</td>
                    <td>{v.areaManager?.name}</td>
                    <td>{new Date(v.visitDate).toLocaleDateString()}</td>
                    <td>{v.notes?.substring(0, 50) || '—'}</td>
                    <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                    <td>
                      {v.status === 'pending' && !isAdmin && !readOnly && !isDealer && (
                        <button className="btn btn-sm btn-primary" onClick={() => updateStatus(v._id, 'completed')}>Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visits.length && <p className="empty-state">No visits found</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Visit</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Dealer</label>
                <select value={form.dealer} onChange={(e) => setForm({ ...form, dealer: e.target.value })} required>
                  <option value="">Select Dealer</option>
                  {dealers.map((d) => <option key={d._id} value={d._id}>{d.dealerName}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Date</label><input type="date" value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} required /></div>
                <div className="form-group"><label>Time</label><input type="time" value={form.visitTime} onChange={(e) => setForm({ ...form, visitTime: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Notes</label><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visits;
