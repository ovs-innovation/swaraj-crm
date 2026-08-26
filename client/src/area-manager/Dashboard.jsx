import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, MapPin, Clock, CheckCircle, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../shared/components/StatCard';
import { dashboardAPI } from '../services/api';
import '../shared/components/StatCard.css';

const AreaManagerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getAreaManager().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="empty-state">Failed to load dashboard</div>;

  const { cards, recentVisits, myDealers, pendingMedia, visitTrend } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Area Manager Dashboard</h1>
          <p className="page-subtitle">Your dealers, field visits and pending approvals</p>
        </div>
        <Link to="/area-manager/dealers" className="btn btn-primary">
          <Plus size={16} /> Add Dealer
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard title="My Dealers" value={cards.assignedDealers} icon={Store} color="primary" />
        <StatCard title="Inactive Dealers" value={cards.inactiveDealers} icon={Store} color="orange" />
        <StatCard title="Today's Visits" value={cards.todayVisits} icon={MapPin} color="blue" />
        <StatCard title="Pending Uploads" value={cards.pendingUploads} icon={Clock} color="orange" />
        <StatCard title="Completed Visits" value={cards.completedVisits} icon={CheckCircle} color="green" />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="card-title">Visit Trend (30 days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={(visitTrend || []).map((d) => ({ date: d._id, visits: d.count }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">My Dealers</h3>
            <Link to="/area-manager/dealers" className="muted">View all</Link>
          </div>
          {myDealers?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Dealer</th>
                    <th>City</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myDealers.map((d) => (
                    <tr key={d._id}>
                      <td>
                        <strong>{d.dealerName}</strong>
                        <br />
                        <small className="muted">{d.dealerCode}</small>
                      </td>
                      <td>{d.city || '—'}</td>
                      <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No dealers yet — create your first dealer</p>
          )}
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <h3 className="card-title">Pending Approvals</h3>
          {pendingMedia?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Dealer</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMedia.map((m) => (
                    <tr key={m._id}>
                      <td>{m.dealer?.dealerName || '—'}</td>
                      <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">Nothing waiting for approval</p>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Recent Visits</h3>
          {recentVisits?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Dealer</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.map((v) => (
                    <tr key={v._id}>
                      <td>{v.dealer?.dealerName}</td>
                      <td>{new Date(v.visitDate).toLocaleDateString()}</td>
                      <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No visits yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AreaManagerDashboard;
