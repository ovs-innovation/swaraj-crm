import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, MapPin, Clock, CheckCircle, Plus } from 'lucide-react';
import StatCard from '../shared/components/StatCard';
import { BrandAreaChart } from '../shared/components/ChartKit';
import { dashboardAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';
import '../shared/components/StatCard.css';

const AreaManagerDashboard = () => {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getAreaManager().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">{t('loading')}</div>;
  if (!data) return <div className="empty-state">{t('loadFail')}</div>;

  const { cards, recentVisits, myDealers, pendingMedia, visitTrend } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('dash.amTitle')}</h1>
          <p className="page-subtitle">{t('dash.amSub')}</p>
        </div>
        <Link to="/area-manager/dealers" className="btn btn-primary">
          <Plus size={16} /> {t('dash.addDealer')}
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard title={t('dash.myDealers')} value={cards.assignedDealers} icon={Store} />
        <StatCard title={t('dash.inactiveDealers')} value={cards.inactiveDealers} icon={Store} tone="mute" />
        <StatCard title={t('dash.todayVisits')} value={cards.todayVisits} icon={MapPin} />
        <StatCard title={t('dash.pendingUploads')} value={cards.pendingUploads} icon={Clock} tone="warn" />
        <StatCard title={t('dash.completedVisits')} value={cards.completedVisits} icon={CheckCircle} tone="ok" />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="card-title">{t('dash.visitTrend')}</h3>
          <BrandAreaChart
            data={(visitTrend || []).map((d) => ({
              date: new Date(d._id).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              visits: d.count,
            }))}
            fillId="amVisitsFill"
          />
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">{t('dash.myDealers')}</h3>
            <Link to="/area-manager/dealers" className="muted">{t('dash.viewAll')}</Link>
          </div>
          {myDealers?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{t('dealers.title')}</th>
                    <th>{t('dealers.city')}</th>
                    <th>{t('status')}</th>
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
                      <td><span className={`badge badge-${d.status}`}>{t(d.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">{t('dash.noDealersYet')}</p>
          )}
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <h3 className="card-title">{t('dash.pendingList')}</h3>
          {pendingMedia?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{t('dealers.title')}</th>
                    <th>{t('date')}</th>
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
            <p className="empty-state">{t('dash.nothingPending')}</p>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">{t('dash.recentVisits')}</h3>
          {recentVisits?.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{t('dealers.title')}</th>
                    <th>{t('date')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.map((v) => (
                    <tr key={v._id}>
                      <td>{v.dealer?.dealerName}</td>
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
    </div>
  );
};

export default AreaManagerDashboard;
