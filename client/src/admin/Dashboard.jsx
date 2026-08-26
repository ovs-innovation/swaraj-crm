import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Users, Store, CheckCircle, Clock, Image, MapPin, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import StatCard from '../shared/components/StatCard';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../shared/context/AuthContext';
import '../shared/components/StatCard.css';

const AdminDashboard = () => {
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin) return;
    dashboardAPI.getAdmin().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, [isSuperAdmin]);

  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="empty-state">Failed to load dashboard</div>;

  const { cards, charts } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Head Office Dashboard</h1>
          <p className="page-subtitle">Area managers, dealers and field operations</p>
        </div>
        <Link to="/admin/area-managers" className="btn btn-primary">
          <Users size={16} /> Area Managers
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard title="Area Managers" value={cards.totalAreaManagers} icon={Users} color="primary" />
        <StatCard title="Total Dealers" value={cards.totalDealers} icon={Store} color="blue" />
        <StatCard title="Active Dealers" value={cards.activeDealers} icon={CheckCircle} color="green" />
        <StatCard title="Pending Approvals" value={cards.pendingApprovals} icon={Clock} color="orange" />
        <StatCard title="Uploaded Media" value={cards.uploadedMedia} icon={Image} color="purple" />
        <StatCard title="Today's Visits" value={cards.todayVisits} icon={MapPin} color="primary" />
        <StatCard title="Monthly Visits" value={cards.monthlyVisits} icon={Calendar} color="blue" />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="card-title">Dealers by State</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.dealersByState.map((d) => ({ name: d._id || 'Unknown', count: d.count }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="card-title">Visit Trend (30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={charts.visitTrend.map((d) => ({ date: d._id, visits: d.count }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
