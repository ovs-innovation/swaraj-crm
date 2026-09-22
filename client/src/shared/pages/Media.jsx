import { useEffect, useState } from 'react';
import { Upload, Check, X } from 'lucide-react';
import { mediaAPI, dealerAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import MediaPreview from '../components/MediaPreview';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Modes:
 * - adminMode: Admin uploads posts (auto-approved) + sees/approves everything
 * - approvalMode: Area Manager approves dealer uploads only
 * - dealerUploadMode: Dealer uploads videos from locations
 * - dealerPostsMode: Dealer views approved posts only
 */
const MediaPage = ({ adminMode = false, approvalMode = false, dealerUploadMode = false, dealerPostsMode = false }) => {
  const { isAdmin, isDealer, user } = useAuth();
  const { t } = useLang();
  const [media, setMedia] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ dealer: '', description: '', location: '' });
  const [filter, setFilter] = useState(approvalMode ? 'pending' : dealerPostsMode ? 'approved' : '');
  const [ask, setAsk] = useState(null);
  const [selected, setSelected] = useState([]);

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
    const item = media.find((m) => m._id === id);
    setAsk({
      title: status === 'rejected' ? t('rejected') : t('approved'),
      message: status === 'rejected'
        ? t('media.confirmReject').replace('{name}', item?.dealer?.dealerName || '')
        : t('media.confirmApprove').replace('{name}', item?.dealer?.dealerName || ''),
      danger: status === 'rejected',
      run: async () => {
        const previous = media;
        setBusyId(id);
        setMedia((list) =>
          list.map((row) => (row._id === id ? { ...row, status } : row)).filter((row) => {
            if (!filter) return true;
            return row.status === filter;
          })
        );
        try {
          await mediaAPI.approve(id, { status, adminComment: '' });
        } catch (err) {
          setMedia(previous);
          alert(err.response?.data?.message || 'Could not update');
        } finally {
          setBusyId('');
          setAsk(null);
        }
      },
    });
  };

  const doDelete = async (ids) => {
    const previous = media;
    setMedia((list) => list.filter((item) => !ids.includes(item._id)));
    try {
      await Promise.all(ids.map((id) => mediaAPI.delete(id)));
      setSelected([]);
    } catch (err) {
      setMedia(previous);
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setAsk(null);
    }
  };

  const handleDelete = (id) => {
    setAsk({
      title: t('delete'),
      message: t('media.confirmDelete'),
      danger: true,
      run: () => doDelete([id]),
    });
  };

  const title = adminMode
    ? t('media.posts')
    : approvalMode
      ? t('media.approve')
      : dealerUploadMode
        ? t('media.upload')
        : dealerPostsMode
          ? t('media.approvedPosts')
          : t('media.posts');

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
          {adminMode && <p className="page-subtitle">{t('media.adminSub')}</p>}
          {approvalMode && <p className="page-subtitle">{t('media.amSub')}</p>}
          {dealerUploadMode && <p className="page-subtitle">{t('media.dealerSub')}</p>}
        </div>
        {canUpload && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={18} /> {adminMode ? t('media.uploadPost') : t('media.upload')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {filters.map((s) => (
          <button key={s || 'all'} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
            {s === 'pending' ? t('pending') : s === 'approved' ? t('approved') : s === 'rejected' ? t('rejected') : t('all')}
          </button>
        ))}
        {isAdmin && media.length > 0 && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={media.length > 0 && selected.length === media.length}
                onChange={() => setSelected(selected.length === media.length ? [] : media.map((m) => m._id))}
              />
              {t('selectAll')}
            </label>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={!selected.length}
              onClick={() => setAsk({
                title: t('deleteSelected'),
                message: t('media.confirmBulk').replace('{n}', String(selected.length)),
                danger: true,
                run: () => doDelete(selected),
              })}
            >
              {t('deleteSelected')} ({selected.length})
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setAsk({
                title: t('deleteAll'),
                message: t('media.confirmBulk').replace('{n}', String(media.length)),
                danger: true,
                run: () => doDelete(media.map((m) => m._id)),
              })}
            >
              {t('deleteAll')}
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {loading ? <div className="loading">{t('loading')}</div> : media.map((m) => (
          <div key={m._id} className="card">
            {isAdmin && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', marginBottom: 6 }}>
                <input type="checkbox" checked={selected.includes(m._id)} onChange={() => setSelected((cur) => (cur.includes(m._id) ? cur.filter((id) => id !== m._id) : [...cur, m._id]))} />
                {t('select')}
              </label>
            )}
            {m.type === 'image' || m.type === 'video' ? (
              <MediaPreview item={m} height={160} />
            ) : (
              <div style={{ height: 150, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
                {m.type?.toUpperCase()}
              </div>
            )}
            <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>
              <strong>{m.dealer?.dealerName}</strong>
              {m.uploadSource && <span className={`badge badge-${m.uploadSource === 'admin' ? 'approved' : 'pending'}`} style={{ marginLeft: 6 }}>{m.uploadSource === 'admin' ? t('roles.admin') : t('roles.dealer')}</span>}
            </p>
            {m.location && <p style={{ fontSize: '0.8rem' }}>📍 {m.location}</p>}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.description || 'No description'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('media.by')}: {m.uploadedBy?.name}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
              <span className={`badge badge-${m.status}`}>{t(m.status)}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {canApprove && m.status === 'pending' && (!approvalMode || m.uploadSource === 'dealer') && (
                  <>
                    <button className="btn btn-sm btn-primary" disabled={busyId === m._id} onClick={() => handleApprove(m._id, 'approved')} title="Approve"><Check size={14} /></button>
                    <button className="btn btn-sm btn-danger" disabled={busyId === m._id} onClick={() => handleApprove(m._id, 'rejected')} title="Reject"><X size={14} /></button>
                  </>
                )}
                {isAdmin && (
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m._id)}>{t('delete')}</button>
                )}
                {isDealer && m.status === 'pending' && String(m.uploadedBy?._id || m.uploadedBy) === String(user?.id) && (
                  <button className="btn btn-sm btn-outline" onClick={() => handleDelete(m._id)}>{t('delete')}</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!loading && !media.length && <p className="empty-state">{t('noData')}</p>}

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{adminMode ? t('media.uploadPost') : t('media.upload')}</h2>
            <form onSubmit={handleUpload}>
              {adminMode && (
                <div className="form-group">
                  <label>{t('dealers.title')}</label>
                  <select value={form.dealer} onChange={(e) => setForm({ ...form, dealer: e.target.value })} required>
                    <option value="">{t('visits.selectDealer')}</option>
                    {dealers.map((d) => <option key={d._id} value={d._id}>{d.dealerName}</option>)}
                  </select>
                </div>
              )}
              {dealerUploadMode && (
                <div className="form-group">
                  <label>{t('media.location')}</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Shop front, Mela, Demo site" />
                </div>
              )}
              <div className="form-group">
                <label>{t('media.file')}</label>
                <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files[0])} required />
              </div>
              <div className="form-group">
                <label>{t('media.description')}</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={dealerUploadMode ? 'What is this video/photo about?' : ''} />
              </div>
              {adminMode && (
                <p className="page-subtitle">{t('media.adminNote')}</p>
              )}
              {dealerUploadMode && (
                <p className="page-subtitle">{t('media.dealerNote')}</p>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('media.upload')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!ask}
        title={ask?.title}
        message={ask?.message}
        danger={ask?.danger}
        onClose={() => setAsk(null)}
        onConfirm={() => ask?.run?.()}
      />
    </div>
  );
};

export default MediaPage;
