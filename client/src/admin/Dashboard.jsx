import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Users, Store, CheckCircle, Clock, Image, MapPin, Calendar } from 'lucide-react';
import StatCard from '../shared/components/StatCard';
import { BrandAreaChart, BrandBarChart } from '../shared/components/ChartKit';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../shared/context/AuthContext';
import { useLang } from '../shared/context/LanguageContext';
import '../shared/components/StatCard.css';

const AdminDashboard = () => {
  const { isSuperAdmin } = useAuth();
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin) return;
    dashboardAPI.getAdmin().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, [isSuperAdmin]);

  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (loading) return <div className="loading">{t('loading')}</div>;
  if (!data) return <div className="empty-state">{t('loadFail')}</div>;

  const { cards, charts } = data;
  const stateData = charts.dealersByState.map((d) => ({ name: d._id || '—', count: d.count }));
  const trendData = charts.visitTrend.map((d) => ({
    date: new Date(d._id).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    visits: d.count,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('dash.hoTitle')}</h1>
          <p className="page-subtitle">{t('dash.hoSub')}</p>
        </div>
        <Link to="/admin/area-managers" className="btn btn-primary">
          <Users size={16} /> {t('dash.areaManagers')}
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard title={t('dash.areaManagers')} value={cards.totalAreaManagers} icon={Users} />
        <StatCard title={t('dash.totalDealers')} value={cards.totalDealers} icon={Store} />
        <StatCard title={t('dash.activeDealers')} value={cards.activeDealers} icon={CheckCircle} tone="ok" />
        <StatCard title={t('dash.pendingApprovals')} value={cards.pendingApprovals} icon={Clock} tone="warn" />
        <StatCard title={t('dash.uploadedMedia')} value={cards.uploadedMedia} icon={Image} />
        <StatCard title={t('dash.todayVisits')} value={cards.todayVisits} icon={MapPin} />
        <StatCard title={t('dash.monthlyVisits')} value={cards.monthlyVisits} icon={Calendar} />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="card-title">{t('dash.dealersByState')}</h3>
          <BrandBarChart data={stateData} horizontal={stateData.length > 6} height={stateData.length > 6 ? Math.max(280, stateData.length * 34) : 280} />
        </div>

        <div className="card">
          <h3 className="card-title">{t('dash.visitTrend')}</h3>
          <BrandAreaChart data={trendData} fillId="hoVisitsFill" />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
