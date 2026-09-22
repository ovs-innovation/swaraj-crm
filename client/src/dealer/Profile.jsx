import { useEffect, useState } from 'react';
import { dealerAPI } from '../services/api';
import MediaPreview from '../shared/components/MediaPreview';
import { useLang } from '../shared/context/LanguageContext';

const DealerProfilePage = () => {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    dealerAPI.getMyProfile().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">{t('loading')}</div>;
  if (!data) return <div className="empty-state">{t('loadFail')}</div>;

  const { dealer, visits, media } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('profile.title')}</h1>
          <p className="page-subtitle">{dealer.dealerName} · {dealer.dealerCode}</p>
        </div>
        <span className={`badge badge-${dealer.status}`}>{t(dealer.status)}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['info', 'visits', 'posts'].map((key) => (
          <button key={key} className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(key)}>
            {key === 'posts' ? t('profile.posts') : key === 'visits' ? t('profile.visits') : t('profile.info')}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card">
          <div className="form-row">
            <div><strong>{t('profile.contact')}</strong><p>{dealer.contactPerson}</p></div>
            <div><strong>{t('mobile')}</strong><p>{dealer.mobile}</p></div>
            <div><strong>{t('email')}</strong><p>{dealer.email || '—'}</p></div>
            <div><strong>{t('profile.am')}</strong><p>{dealer.areaManager?.name || '—'}</p></div>
            <div><strong>{t('profile.address')}</strong><p>{dealer.address || '—'}</p></div>
            <div><strong>{t('dealers.city')}</strong><p>{dealer.city || '—'}</p></div>
            <div><strong>{t('dealers.state')}</strong><p>{dealer.state}</p></div>
            <div><strong>{t('dealers.district')}</strong><p>{dealer.district}</p></div>
          </div>
        </div>
      )}

      {tab === 'visits' && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>{t('date')}</th><th>{t('notes')}</th><th>{t('status')}</th></tr></thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v._id}>
                    <td>{new Date(v.visitDate).toLocaleDateString()}</td>
                    <td>{v.notes || '—'}</td>
                    <td><span className={`badge badge-${v.status}`}>{t(v.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visits.length && <p className="empty-state">{t('dash.noVisits')}</p>}
          </div>
        </div>
      )}

      {tab === 'posts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {media.map((m) => (
            <div key={m._id} className="card" style={{ padding: '1rem' }}>
              {m.type === 'image' || m.type === 'video' ? (
                <MediaPreview item={m} height={140} />
              ) : (
                <div style={{ height: 140, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.type}</div>
              )}
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{m.description || 'No description'}</p>
            </div>
          ))}
          {!media.length && <p className="empty-state">{t('noData')}</p>}
        </div>
      )}
    </div>
  );
};

export default DealerProfilePage;
