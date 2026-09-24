import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Users, Store, ShieldOff, Clock, MapPin, Shield, Clapperboard, AlertTriangle, CalendarClock } from 'lucide-react';
import StatCard from '../shared/components/StatCard';
import { BrandBarChart } from '../shared/components/ChartKit';
import { dashboardAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';
import '../shared/components/StatCard.css';

const SuperAdminDashboard = () => {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getSuperAdmin().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">{t('loading')}</div>;
  if (!data) return <div className="empty-state">{t('loadFail')}</div>;

  const { cards, charts, recentActivities, recentHqUsers } = data;
  const barData = (charts.dealersByManager || []).map((d) => ({ name: d.name, count: d.count }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('dash.superTitle')}</h1>
          <p className="page-subtitle">{t('dash.superSub')}</p>
        </div>
        <Link to="/admin/users" className="btn btn-primary">
          <Crown size={16} /> {t('dash.manageHq')}
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard title={t('dash.superAdmins')} value={cards.totalSuperAdmins} icon={Crown} />
        <StatCard title={t('dash.hoAdmins')} value={cards.totalAdmins} icon={Shield} />
        <StatCard title={t('dash.areaManagers')} value={cards.totalAreaManagers} icon={Users} />
        <StatCard title={t('dash.dealers')} value={cards.totalDealers} icon={Store} />
        <StatCard title={t('dash.inactiveDealers')} value={cards.inactiveDealers} icon={ShieldOff} tone="mute" />
        <StatCard title={t('dash.pendingApprovals')} value={cards.pendingApprovals} icon={Clock} tone="warn" />
        <StatCard title={t('dash.todayVisits')} value={cards.todayVisits} icon={MapPin} />
        <StatCard title={t('dash.pendingVideos')} value={cards.pendingVideos || 0} icon={Clapperboard} tone="warn" />
        <StatCard title={t('dash.renderingVideos')} value={cards.renderingVideos || 0} icon={Clapperboard} />
        <StatCard title={t('dash.waitingAm')} value={cards.waitingAmVideos || 0} icon={Clock} tone="warn" />
        <StatCard title={t('dash.scheduledVideos')} value={cards.scheduledVideos || 0} icon={CalendarClock} />
        <StatCard title={t('dash.publishedToday')} value={cards.publishedToday || 0} icon={Clapperboard} />
        <StatCard title={t('dash.failedVideos')} value={cards.failedVideos || 0} icon={AlertTriangle} tone="mute" />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="card-title">{t('dash.dealersByAm')}</h3>
          <BrandBarChart data={barData} horizontal={barData.length > 5} height={barData.length > 5 ? Math.max(280, barData.length * 36) : 280} />
        </div>

        <div className="card">
          <h3 className="card-title">{t('dash.hqUsers')}</h3>
          {recentHqUsers?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{t('name')}</th>
                    <th>{t('users.role')}</th>
                    <th>{t('status')}</th>
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
                          {t(`roles.${u.role}`)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${u.status}`}>{t(u.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">{t('noData')}</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '0.9rem' }}>
        <h3 className="card-title">{t('dash.systemActivity')}</h3>
        {recentActivities?.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('audit.action')}</th>
                  <th>{t('media.by')}</th>
                  <th>{t('date')}</th>
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
          <p className="empty-state">{t('noData')}</p>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
