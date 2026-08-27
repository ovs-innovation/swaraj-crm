import { useEffect, useState } from 'react';
import { dealerAPI } from '../services/api';
import MediaPreview from '../shared/components/MediaPreview';

const DealerProfilePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    dealerAPI.getMyProfile().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!data) return <div className="empty-state">Profile not found</div>;

  const { dealer, visits, media } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{dealer.dealerName} · {dealer.dealerCode}</p>
        </div>
        <span className={`badge badge-${dealer.status}`}>{dealer.status}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['info', 'visits', 'posts'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'posts' ? 'Approved Posts' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card">
          <div className="form-row">
            <div><strong>Contact Person</strong><p>{dealer.contactPerson}</p></div>
            <div><strong>Mobile</strong><p>{dealer.mobile}</p></div>
            <div><strong>Email</strong><p>{dealer.email || '—'}</p></div>
            <div><strong>Area Manager</strong><p>{dealer.areaManager?.name || '—'}</p></div>
            <div><strong>Address</strong><p>{dealer.address || '—'}</p></div>
            <div><strong>City</strong><p>{dealer.city || '—'}</p></div>
            <div><strong>State</strong><p>{dealer.state}</p></div>
            <div><strong>District</strong><p>{dealer.district}</p></div>
          </div>
        </div>
      )}

      {tab === 'visits' && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Date</th><th>Notes</th><th>Status</th></tr></thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v._id}>
                    <td>{new Date(v.visitDate).toLocaleDateString()}</td>
                    <td>{v.notes || '—'}</td>
                    <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visits.length && <p className="empty-state">No visits yet</p>}
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
          {!media.length && <p className="empty-state">No approved posts yet</p>}
        </div>
      )}
    </div>
  );
};

export default DealerProfilePage;
