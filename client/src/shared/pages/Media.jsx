import { useEffect, useState } from 'react';
import { Upload, Check, X } from 'lucide-react';
import { mediaAPI, dealerAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import MediaPreview from '../components/MediaPreview';

/**
 * Modes:
 * - adminMode: Admin uploads posts (auto-approved) + sees/approves everything
 * - approvalMode: Area Manager approves dealer uploads only
 * - dealerUploadMode: Dealer uploads videos from locations
 * - dealerPostsMode: Dealer views approved posts only
 */
const MediaPage = ({ adminMode = false, approvalMode = false, dealerUploadMode = false, dealerPostsMode = false }) => {
  const { isAdmin, isDealer, user } = useAuth();
  const [media, setMedia] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ dealer: '', description: '', location: '' });
  const [filter, setFilter] = useState(approvalMode ? 'pending' : dealerPostsMode ? 'approved' : '');

  const fetchMedia = (silent = false) => {
    if (!silent) setLoading(true);
    const params = {};
    if (filter) params.status = filter;
    if (approvalMode) params.dealerUploadsOnly = 'true';
    if (dealerPostsMode) params.approvedOnly = 'true';
    mediaAPI.getAll(params).then((res) => setMedia(res.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMedia();
    if (adminMode) dealerAPI.getAll({ limit: 100 }).then((res) => setDealers(res.data.data));
  }, [filter, adminMode, approvalMode, dealerPostsMode]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('description', form.description);
    if (form.location) fd.append('location', form.location);
    if (adminMode) fd.append('dealer', form.dealer);
    await mediaAPI.upload(fd);
    setShowUpload(false);
    setFile(null);
    setForm({ dealer: '', description: '', location: '' });
    fetchMedia(true);
  };

  const handleApprove = async (id, status) => {
    let comment = '';
    if (status === 'rejected') {
      const reason = prompt('Rejection reason:');
      if (reason === null) return;
      comment = reason;
    }
    const previous = media;
    setBusyId(id);
    setMedia((list) =>
      list.map((item) => (item._id === id ? { ...item, status } : item)).filter((item) => {
        if (!filter) return true;
        return item.status === filter;
      })
    );
    try {
      await mediaAPI.approve(id, { status, adminComment: comment });
    } catch (err) {
      setMedia(previous);
      alert(err.response?.data?.message || 'Could not update');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this upload?')) return;
    const previous = media;
    setMedia((list) => list.filter((item) => item._id !== id));
    try {
      await mediaAPI.delete(id);
    } catch (err) {
      setMedia(previous);
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const title = adminMode
    ? 'Posts & Media'
    : approvalMode
      ? 'Approve Dealer Uploads'
      : dealerUploadMode
        ? 'Upload Video / Photo'
        : dealerPostsMode
          ? 'Approved Posts'
          : 'Media';

  const canUpload = adminMode || dealerUploadMode;
  const canApprove = (adminMode || approvalMode);
  const filters = dealerPostsMode
    ? ['approved']
    : approvalMode
      ? ['pending', 'approved', 'rejected', '']
      : ['', 'pending', 'approved', 'rejected'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          {adminMode && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Upload marketing posts · View & manage all media</p>}
          {approvalMode && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Review videos/photos uploaded by your dealers</p>}
          {dealerUploadMode && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Upload from shop, event or any location — Area Manager will approve</p>}
        </div>
        {canUpload && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={18} /> {adminMode ? 'Upload Post' : 'Upload'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {filters.map((s) => (
          <button key={s || 'all'} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
            {s === 'pending' ? 'Pending' : s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : 'All'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {loading ? <div className="loading">Loading...</div> : media.map((m) => (
          <div key={m._id} className="card">
            {m.type === 'image' || m.type === 'video' ? (
              <MediaPreview item={m} height={160} />
            ) : (
              <div style={{ height: 150, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
                {m.type?.toUpperCase()}
              </div>
            )}
            <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>
              <strong>{m.dealer?.dealerName}</strong>
              {m.uploadSource && <span className={`badge badge-${m.uploadSource === 'admin' ? 'approved' : 'pending'}`} style={{ marginLeft: 6 }}>{m.uploadSource === 'admin' ? 'Admin Post' : 'Dealer'}</span>}
            </p>
            {m.location && <p style={{ fontSize: '0.8rem' }}>📍 {m.location}</p>}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.description || 'No description'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By: {m.uploadedBy?.name} ({m.uploadedBy?.role?.replace('_', ' ')})</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
              <span className={`badge badge-${m.status}`}>{m.status}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {canApprove && m.status === 'pending' && (!approvalMode || m.uploadSource === 'dealer') && (
                  <>
                    <button className="btn btn-sm btn-primary" disabled={busyId === m._id} onClick={() => handleApprove(m._id, 'approved')} title="Approve"><Check size={14} /></button>
                    <button className="btn btn-sm btn-danger" disabled={busyId === m._id} onClick={() => handleApprove(m._id, 'rejected')} title="Reject"><X size={14} /></button>
                  </>
                )}
                {isAdmin && (
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m._id)}>Delete</button>
                )}
                {isDealer && m.status === 'pending' && String(m.uploadedBy?._id || m.uploadedBy) === String(user?.id) && (
                  <button className="btn btn-sm btn-outline" onClick={() => handleDelete(m._id)}>Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!loading && !media.length && <p className="empty-state">No media found</p>}

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{adminMode ? 'Upload Post' : 'Upload Video / Photo'}</h2>
            <form onSubmit={handleUpload}>
              {adminMode && (
                <div className="form-group">
                  <label>Dealer</label>
                  <select value={form.dealer} onChange={(e) => setForm({ ...form, dealer: e.target.value })} required>
                    <option value="">Select Dealer</option>
                    {dealers.map((d) => <option key={d._id} value={d._id}>{d.dealerName}</option>)}
                  </select>
                </div>
              )}
              {dealerUploadMode && (
                <div className="form-group">
                  <label>Location / Place</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Shop front, Mela, Demo site" />
                </div>
              )}
              <div className="form-group">
                <label>File</label>
                <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files[0])} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={dealerUploadMode ? 'What is this video/photo about?' : ''} />
              </div>
              {adminMode && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Admin posts are published immediately (auto-approved).</p>
              )}
              {dealerUploadMode && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Your Area Manager will review and approve this upload.</p>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPage;
