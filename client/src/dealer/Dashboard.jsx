import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image, MapPin, CheckCircle, Clock, Upload, Phone } from 'lucide-react';
import StatCard from '../shared/components/StatCard';
import { dashboardAPI } from '../services/api';
import '../shared/components/StatCard.css';

const DealerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getDealer().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="empty-state">Failed to load dashboard</div>;

  const { dealer, cards, recentMedia, recentVisits } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dealer Dashboard</h1>
          <p className="page-subtitle">
            {dealer.dealerName} · {dealer.dealerCode}
          </p>
        </div>
        <Link to="/dealer/upload" className="btn btn-primary">
          <Upload size={16} /> Upload Video
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard title="Approved Posts" value={cards.approvedMedia} icon={Image} color="green" />
        <StatCard title="Pending Review" value={cards.pendingMedia} icon={Clock} color="orange" />
        <StatCard title="Rejected" value={cards.rejectedMedia} icon={Image} color="primary" />
        <StatCard title="Total Visits" value={cards.totalVisits} icon={MapPin} color="blue" />
        <StatCard title="Completed Visits" value={cards.completedVisits} icon={CheckCircle} color="green" />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="card-title">Your Area Manager</h3>
          {dealer.areaManager ? (
            <div className="am-card">
              <div className="user-avatar">{dealer.areaManager.name?.charAt(0)}</div>
              <div>
                <strong>{dealer.areaManager.name}</strong>
                <p className="muted">{dealer.areaManager.employeeId || 'Area Manager'}</p>
                {dealer.areaManager.mobile && (
                  <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <Phone size={14} /> {dealer.areaManager.mobile}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="empty-state">No area manager assigned</p>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Recent Uploads</h3>
          {recentMedia?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMedia.map((m) => (
                    <tr key={m._id}>
                      <td>{m.type}</td>
                      <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                      <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No uploads yet</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">Visit History</h3>
        {recentVisits?.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map((v) => (
                  <tr key={v._id}>
                    <td>{new Date(v.visitDate).toLocaleDateString()}</td>
                    <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No visits recorded</p>
        )}
      </div>
    </div>
  );
};

export default DealerDashboard;
