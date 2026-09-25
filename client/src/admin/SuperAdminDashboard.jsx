import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, Clock, MapPin, Clapperboard, AlertTriangle, Images, Share2, ArrowRight } from 'lucide-react';
import { BrandBarChart } from '../shared/components/ChartKit';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../shared/context/AuthContext';
import { useLang } from '../shared/context/LanguageContext';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const { t } = useLang();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    dashboardAPI.getSuperAdmin()
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="loading">{t('loading')}</div>;
  if (!data) return <div className="empty-state">{t('loadFail')}</div>;

  const { cards, charts, recentActivities, inboxSheets } = data;
  const barData = (charts.dealersByManager || []).map((d) => ({ name: d.name, count: d.count }));
  const waiting = (cards.pendingSheets || 0) + (cards.generatedSheets || 0) + (cards.pendingVideos || 0) + (cards.failedVideos || 0);

  const jobs = [
    { n: cards.pendingSheets || 0, label: t('dash.doPosters'), to: '/super-admin/posters', icon: Images },
    { n: cards.generatedSheets || 0, label: t('dash.doSend'), to: '/super-admin/posters', icon: Images },
    { n: cards.pendingVideos || 0, label: t('dash.doVideos'), to: '/super-admin/videos', icon: Clapperboard },
    { n: cards.failedVideos || 0, label: t('dash.doFailed'), to: '/super-admin/videos', icon: AlertTriangle },
  ].filter((j) => j.n > 0);

  return (
    <div className="sa-home">
      <div className="sa-cols">
        <div>
          <div className="sa-hero">
            <div>
              <p className="sa-kicker">{t(`roles.${user?.role || 'super_admin'}`)} · {user?.name}</p>
              <h1>{t('dash.superTitle')}</h1>
              <p className="page-subtitle">{t('dash.superSub')}</p>
            </div>
          </div>

          <div className="sa-now">
            <h3 className="card-title">{t('dash.nowTitle')}</h3>
            {jobs.length ? (
              <div className="sa-now-grid">
                {jobs.map((j) => (
                  <Link key={j.label} to={j.to} className="sa-now-card">
                    <j.icon size={18} />
                    <em>{j.n}</em>
                    <span>{j.label}</span>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="sa-clear">{t('dash.nowClear')}</p>
            )}
          </div>

          <div className="sa-actions">
            <Link to="/super-admin/posters" className="sa-act"><Images size={16} /> {t('nav.posters')}</Link>
            <Link to="/super-admin/videos" className="sa-act"><Clapperboard size={16} /> {t('nav.videos')}</Link>
            <Link to="/super-admin/social" className="sa-act"><Share2 size={16} /> {t('dash.doSocial')}</Link>
            <Link to="/admin/area-managers" className="sa-act"><Users size={16} /> {t('dash.doAm')}</Link>
            <Link to="/admin/dealers" className="sa-act"><Store size={16} /> {t('dash.doDealers')}</Link>
          </div>

          {!!inboxSheets?.length && (
            <div className="card sa-inbox">
              <h3 className="card-title">{t('dash.inboxSheets')}</h3>
              <div className="sa-inbox-list">
                {inboxSheets.map((s) => (
                  <Link key={s._id} to="/super-admin/posters" className="sa-inbox-row">
                    <b>{s.areaManager?.name || '—'}</b>
                    <span>{s.fileName}</span>
                    <em>{t(s.status === 'generated' ? 'dash.sheetReady' : 'dash.sheetPending')}</em>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="card-title">{t('dash.dealersByAm')}</h3>
            <BrandBarChart data={barData} horizontal={barData.length > 5} height={barData.length > 5 ? Math.max(220, barData.length * 32) : 220} />
          </div>
        </div>

        <aside className="sa-side">
          <div className="sa-hero-meta">
            <strong>{waiting}</strong>
            <span>{t('dash.nowTitle')}</span>
          </div>
          <div className="sa-metrics">
            <div className="sa-metric"><Users size={16} /><b>{cards.totalAreaManagers}</b><span>{t('dash.areaManagers')}</span></div>
            <div className="sa-metric"><Store size={16} /><b>{cards.totalDealers}</b><span>{t('dash.dealers')}</span></div>
            <div className="sa-metric"><MapPin size={16} /><b>{cards.todayVisits}</b><span>{t('dash.todayVisits')}</span></div>
            <div className="sa-metric"><Clock size={16} /><b>{cards.pendingApprovals}</b><span>{t('dash.pendingApprovals')}</span></div>
            <div className="sa-metric"><Clapperboard size={16} /><b>{cards.publishedToday || 0}</b><span>{t('dash.publishedToday')}</span></div>
            <div className="sa-metric"><Clock size={16} /><b>{cards.waitingAmVideos || 0}</b><span>{t('dash.waitingAm')}</span></div>
          </div>
          <div className="card">
            <h3 className="card-title">{t('dash.systemActivity')}</h3>
            {recentActivities?.length ? (
              <ul className="sa-activity">
                {recentActivities.map((a) => (
                  <li key={a._id}>
                    <strong>{a.description || a.action}</strong>
                    <span>{a.performedBy?.name || '—'} · {new Date(a.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">{t('noData')}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
