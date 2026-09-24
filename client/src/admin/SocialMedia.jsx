import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Send } from 'lucide-react';
import { socialAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';
import { mediaUrl } from '../utils/mediaUrl';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import './SocialMedia.css';

const platforms = ['facebook', 'instagram', 'both'];

const SocialMedia = () => {
  const { t } = useLang();
  const [config, setConfig] = useState(null);
  const [rows, setRows] = useState([]);
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [platform, setPlatform] = useState('both');
  const [scheduledAt, setScheduledAt] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [ask, setAsk] = useState(null);

  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const message = useMemo(() => {
    const tags = hashtags
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => (x.startsWith('#') ? x : `#${x}`))
      .join(' ');
    return [caption.trim(), tags].filter(Boolean).join('\n\n');
  }, [caption, hashtags]);

  const load = () => {
    socialAPI.config().then((res) => setConfig(res.data.data)).catch(() => setConfig(null));
    socialAPI.list({ limit: 40 }).then((res) => setRows(res.data.data || [])).catch(() => setRows([]));
  };

  useEffect(() => { load(); }, []);

  const buildForm = () => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    fd.append('caption', caption);
    fd.append('hashtags', hashtags);
    fd.append('platform', platform);
    return fd;
  };

  const send = async (action) => {
    setErr('');
    setMsg('');
    if (!files.length) {
      setErr(t('social.needImages'));
      return;
    }
    if (action === 'schedule') {
      if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now() + 60 * 1000) {
        setErr(t('social.needTime'));
        return;
      }
    }
    setBusy(action);
    try {
      const fd = buildForm();
      fd.append('action', action);
      if (scheduledAt) fd.append('scheduledAt', new Date(scheduledAt).toISOString());
      const res = await socialAPI.publish(fd);
      setMsg(res.data.message || t('social.published'));
      setFiles([]);
      setCaption('');
      setHashtags('');
      setScheduledAt('');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || t('social.failed'));
      load();
    } finally {
      setBusy('');
      setAsk(null);
    }
  };

  return (
    <div className="social-page">
      <div className="page-header">
        <div>
          <h1>{t('social.title')}</h1>
          <p>{t('social.sub')}</p>
        </div>
      </div>

      {config && (
        <div className="social-config">
          <span className={`badge ${config.facebookReady ? 'badge-approved' : 'badge-rejected'}`}>
            {config.facebookReady ? t('social.fbReady') : t('social.fbMissing')}
          </span>
          <span className={`badge ${config.instagramReady ? 'badge-approved' : 'badge-rejected'}`}>
            {config.instagramReady ? t('social.igReady') : t('social.igMissing')}
          </span>
        </div>
      )}

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      <div className="social-grid">
        <div className="card">
          <h3>{t('social.compose')}</h3>
          <div className="form-group">
            <label>{t('social.images')}</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <small>{t('social.imagesHint')}</small>
          </div>
          <div className="form-group">
            <label>{t('social.caption')}</label>
            <textarea rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('social.hashtags')}</label>
            <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#swaraj #dealers" />
            <small>{t('social.hashtagsHint')}</small>
          </div>
          <div className="form-group">
            <label>{t('social.platform')}</label>
            <div className="social-platforms">
              {platforms.map((p) => (
                <label key={p} className={platform === p ? 'on' : ''}>
                  <input type="radio" name="platform" checked={platform === p} onChange={() => setPlatform(p)} />
                  {t(`social.${p}`)}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>{t('social.scheduleAt')}</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div className="social-actions">
            <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => setAsk('publish')}>
              <Send size={16} /> {t('social.publish')}
            </button>
            <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => setAsk('schedule')}>
              <CalendarClock size={16} /> {t('social.schedule')}
            </button>
          </div>
        </div>

        <div className="card">
          <h3>{t('social.preview')}</h3>
          <div className="social-preview">
            <div className="social-preview-photos">
              {previews.length ? previews.map((p) => (
                <img key={p.url} src={p.url} alt="" />
              )) : <div className="social-preview-empty">{t('social.needImages')}</div>}
            </div>
            <p className="social-preview-meta">{t(`social.${platform}`)}</p>
            <pre>{message || '—'}</pre>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>{t('social.history')}</h3>
        {!rows.length ? (
          <p className="empty-state" style={{ padding: '1rem 0' }}>{t('social.empty')}</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('social.images')}</th>
                  <th>{t('social.caption')}</th>
                  <th>{t('social.platform')}</th>
                  <th>{t('social.publishedAt')}</th>
                  <th>{t('social.status')}</th>
                  <th>{t('social.error')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <div className="social-thumbs">
                        {(row.images || []).slice(0, 3).map((img) => (
                          <img key={img.url} src={mediaUrl(img.url)} alt="" />
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="social-cap">{row.caption || row.message}</div>
                      {row.hashtags ? <small>{row.hashtags}</small> : null}
                    </td>
                    <td>{t(`social.${row.platform}`)}</td>
                    <td>{row.publishedAt ? new Date(row.publishedAt).toLocaleString() : row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : '—'}</td>
                    <td>
                      <span className={`badge badge-${row.status}`}>
                        {t(`social.${row.status}`) || row.status}
                      </span>
                    </td>
                    <td className="social-err">{row.errorMessage || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!ask}
        title={ask === 'schedule' ? t('social.schedule') : t('social.publish')}
        message={message || t('social.preview')}
        busy={!!busy}
        onClose={() => !busy && setAsk(null)}
        onConfirm={() => send(ask)}
      />
    </div>
  );
};

export default SocialMedia;
