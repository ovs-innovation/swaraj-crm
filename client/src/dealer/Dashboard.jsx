import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image, MapPin, CheckCircle, Clock, Upload, Phone } from 'lucide-react';
import StatCard from '../shared/components/StatCard';
import { dashboardAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';
import RoleBanner from '../shared/components/RoleBanner';
import '../shared/components/StatCard.css';

const DealerDashboard = () => {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getDealer().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">{t('loading')}</div>;
  if (!data) return <div className="empty-state">{t('loadFail')}</div>;

  const { dealer, cards, recentMedia, recentVisits } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('dash.dealerTitle')}</h1>
          <p className="page-subtitle">
            {dealer.dealerName} · {dealer.dealerCode}
          </p>
        </div>
        <Link to="/dealer/upload" className="btn btn-primary">
          <Upload size={16} /> {t('dash.uploadVideo')}
        </Link>
      </div>
      <RoleBanner extra={dealer.dealerName ? `${dealer.dealerName}` : ''} />

      <div className="stat-grid">
        <StatCard title={t('dash.approvedPosts')} value={cards.approvedMedia} icon={Image} tone="ok" />
        <StatCard title={t('dash.pendingReview')} value={cards.pendingMedia} icon={Clock} tone="warn" />
        <StatCard title={t('dash.rejected')} value={cards.rejectedMedia} icon={Image} tone="mute" />
        <StatCard title={t('dash.totalVisits')} value={cards.totalVisits} icon={MapPin} />
        <StatCard title={t('dash.completedVisits')} value={cards.completedVisits} icon={CheckCircle} tone="ok" />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="card-title">{t('dash.yourAm')}</h3>
          {dealer.areaManager ? (
            <div className="am-card">
              <div className="user-avatar">{dealer.areaManager.name?.charAt(0)}</div>
              <div>
                <strong>{dealer.areaManager.name}</strong>
                <p className="muted">{dealer.areaManager.employeeId || t('roles.area_manager')}</p>
                {dealer.areaManager.mobile && (
                  <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <Phone size={14} /> {dealer.areaManager.mobile}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="empty-state">{t('dash.noAm')}</p>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">{t('dash.recentUploads')}</h3>
          {recentMedia?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{t('media.type')}</th>
                    <th>{t('status')}</th>
                    <th>{t('date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMedia.map((m) => (
                    <tr key={m._id}>
                      <td>{m.type}</td>
                      <td><span className={`badge badge-${m.status}`}>{t(m.status)}</span></td>
                      <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">{t('dash.noUploads')}</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">{t('dash.visitHistory')}</h3>
        {recentVisits?.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map((v) => (
                  <tr key={v._id}>
                    <td>{new Date(v.visitDate).toLocaleDateString()}</td>
                    <td><span className={`badge badge-${v.status}`}>{t(v.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">{t('dash.noVisits')}</p>
        )}
      </div>
    </div>
  );
};

export default DealerDashboard;
