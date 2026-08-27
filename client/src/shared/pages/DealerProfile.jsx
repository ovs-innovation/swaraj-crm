import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { dealerAPI } from '../../services/api';
import MediaPreview from '../components/MediaPreview';

const DealerProfile = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    dealerAPI.getProfile(id).then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!data) return <div className="empty-state">Dealer not found</div>;

  const { dealer, visits, media, activities, assignmentHistory } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{dealer.dealerName}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{dealer.dealerCode} · {dealer.state}, {dealer.district}</p>
        </div>
        <span className={`badge badge-${dealer.status}`}>{dealer.status}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['info', 'visits', 'media', 'activity', 'assignments'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
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
            <div><strong>GST</strong><p>{dealer.gstNumber || '—'}</p></div>
            <div><strong>Language</strong><p>{dealer.preferredLanguage}</p></div>
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
            {!visits.length && <p className="empty-state">No visits recorded</p>}
          </div>
        </div>
      )}

      {tab === 'media' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {media.map((m) => (
            <div key={m._id} className="card" style={{ padding: '1rem' }}>
              {m.type === 'image' || m.type === 'video' ? (
                <MediaPreview item={m} height={120} />
              ) : (
                <div style={{ height: 120, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.type}</div>
              )}
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{m.description || 'No description'}</p>
              <span className={`badge badge-${m.status}`}>{m.status}</span>
            </div>
          ))}
          {!media.length && <p className="empty-state">No media uploaded</p>}
        </div>
      )}

      {tab === 'activity' && (
        <div className="card">
          {activities.map((a) => (
            <div key={a._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{a.description}</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {a.performedBy?.name} · {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {!activities.length && <p className="empty-state">No activity yet</p>}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="card">
          {assignmentHistory.map((h) => (
            <div key={h._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{h.fromAreaManager?.name || 'Unassigned'} → {h.toAreaManager?.name}</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                By {h.assignedBy?.name} · {new Date(h.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {!assignmentHistory.length && <p className="empty-state">No assignment history</p>}
        </div>
      )}
    </div>
  );
};

export default DealerProfile;
