import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Users, Store, ShieldOff, Clock, MapPin, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../shared/components/StatCard';
import { dashboardAPI } from '../services/api';
import '../shared/components/StatCard.css';

const SuperAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getSuperAdmin().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="empty-state">Failed to load dashboard</div>;

  const { cards, charts, recentActivities, recentHqUsers } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p className="page-subtitle">Full system control — users, admins, and every dealer in the network</p>
        </div>
        <Link to="/admin/users" className="btn btn-primary">
          <Crown size={16} /> Manage HQ Users
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard title="Super Admins" value={cards.totalSuperAdmins} icon={Crown} color="purple" />
        <StatCard title="HO Admins" value={cards.totalAdmins} icon={Shield} color="primary" />
        <StatCard title="Area Managers" value={cards.totalAreaManagers} icon={Users} color="blue" />
        <StatCard title="Dealers" value={cards.totalDealers} icon={Store} color="green" />
        <StatCard title="Inactive Dealers" value={cards.inactiveDealers} icon={ShieldOff} color="orange" />
        <StatCard title="Pending Approvals" value={cards.pendingApprovals} icon={Clock} color="orange" />
        <StatCard title="Today's Visits" value={cards.todayVisits} icon={MapPin} color="primary" />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="card-title">Dealers by Area Manager</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(charts.dealersByManager || []).map((d) => ({ name: d.name, count: d.count }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="card-title">HQ Users</h3>
          {recentHqUsers?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentHqUsers.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <strong>{u.name}</strong>
                        <br />
                        <small className="muted">{u.email}</small>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'super_admin' ? 'badge-super' : 'badge-active'}`}>
                          {u.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${u.status}`}>{u.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No HQ users</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">System Activity</h3>
        {recentActivities?.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((a) => (
                  <tr key={a._id}>
                    <td>{a.description || a.action}</td>
                    <td>{a.performedBy?.name || '—'}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
