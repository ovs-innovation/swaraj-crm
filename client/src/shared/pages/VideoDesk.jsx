import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Download, Play, RefreshCw } from 'lucide-react';
import { videoAPI, dealerAPI, studioAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { mediaUrl } from '../../utils/mediaUrl';
import ConfirmDialog from '../components/ConfirmDialog';
import './VideoDesk.css';

const emptySpec = {
  trimStart: 0,
  trimEnd: 0,
  aspect: 'original',
  rotate: 0,
  flipH: false,
  flipV: false,
  compress: true,
  resolution: '720',
  muteOriginal: false,
  originalVolume: 1,
  musicVolume: 0.35,
  texts: [{ text: '', size: 36, color: '#ffffff', x: 0.08, y: 0.08 }],
};

const VideoDesk = ({ mode = 'super' }) => {
  const { t } = useLang();
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [ask, setAsk] = useState(null);
  const [comment, setComment] = useState('');
  const [platform, setPlatform] = useState('both');
  const [scheduledAt, setScheduledAt] = useState('');
  const [upload, setUpload] = useState({ dealer: '', caption: '', hashtags: '', video: null, thumbnail: null });
  const [spec, setSpec] = useState(emptySpec);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [assets, setAssets] = useState({});
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const [compare, setCompare] = useState('edited');
  const [stats, setStats] = useState(null);
  const [trail, setTrail] = useState([]);

  const load = async () => {
    const res = await videoAPI.list({ limit: 50 });
    setRows(res.data.data || []);
    if (open?._id) {
      const fresh = res.data.data.find((r) => r._id === open._id);
      if (fresh) setOpen(fresh);
    }
  };

  useEffect(() => {
    load().catch(() => setErr(t('loadFail')));
    if (isSuperAdmin) {
      dealerAPI.getAll({ limit: 100 }).then((res) => setDealers(res.data.data || []));
      studioAPI.templates().then((res) => setTemplates(res.data.data || [])).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSpec({ ...emptySpec, ...(open.editSpec || {}) });
    setCaption(open.caption || '');
    setHashtags(open.hashtags || '');
    setComment(open.changeRequest || '');
    if (open._id) videoAPI.trail(open._id).then((res) => setTrail(res.data.data || [])).catch(() => setTrail([]));
  }, [open?._id]);

  useEffect(() => {
    const tmr = setInterval(() => {
      if (rows.some((r) => ['queued', 'rendering'].includes(r.status))) load();
    }, 4000);
    return () => clearInterval(tmr);
  }, [rows]);

  const previewSrc = useMemo(() => {
    if (!open) return '';
    if (compare === 'original') return mediaUrl(open.originalUrl);
    if (String(compare).startsWith('v')) {
      const ver = open.versions?.[Number(compare.slice(1))];
      return mediaUrl(ver?.url || open.editedUrl || open.originalUrl);
    }
    return mediaUrl(open.editedUrl || open.originalUrl);
  }, [open, compare]);

  const submitDealer = async (e) => {
    e.preventDefault();
    if (!upload.video) return setErr(t('video.needVideo'));
    setBusy('upload');
    setErr('');
    try {
      const fd = new FormData();
      fd.append('video', upload.video);
      if (upload.thumbnail) fd.append('thumbnail', upload.thumbnail);
      fd.append('caption', upload.caption);
      fd.append('hashtags', upload.hashtags);
      if (isSuperAdmin && upload.dealer) fd.append('dealer', upload.dealer);
      await videoAPI.upload(fd);
      setMsg(t('video.uploaded'));
      setUpload({ dealer: '', caption: '', hashtags: '', video: null, thumbnail: null });
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || t('video.fail'));
    } finally {
      setBusy('');
    }
  };

  const saveDraft = async () => {
    if (!open) return;
    setBusy('save');
    try {
      const fd = new FormData();
      fd.append('caption', caption);
      fd.append('hashtags', hashtags);
      fd.append('editSpec', JSON.stringify(spec));
      ['watermark', 'intro', 'outro', 'music', 'srt', 'thumbnail'].forEach((k) => {
        if (assets[k]) fd.append(k, assets[k]);
      });
      (assets.merge || []).forEach((f) => fd.append('merge', f));
      const res = await videoAPI.save(open._id, fd);
      setOpen(res.data.data);
      setMsg(t('video.draftSaved'));
      setAssets({});
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || t('video.fail'));
    } finally {
      setBusy('');
    }
  };

  const run = async (fn) => {
    try {
      await fn();
      await load();
    } catch (e2) {
      setErr(e2.response?.data?.message || t('video.fail'));
    } finally {
      setBusy('');
      setAsk(null);
    }
  };

  const setText = (i, patch) => {
    const texts = [...(spec.texts || emptySpec.texts)];
    texts[i] = { ...texts[i], ...patch };
    setSpec({ ...spec, texts });
  };

  return (
    <div className="video-desk">
      <div className="page-header">
        <div>
          <h1>{t('video.title')}</h1>
          <p>{t(`video.sub.${mode}`)}</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={load}><RefreshCw size={15} /> {t('video.refresh')}</button>
      </div>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      {mode === 'dealer' && (
        <form className="card video-upload" onSubmit={submitDealer}>
          <h3>{t('video.upload')}</h3>
          {isSuperAdmin && (
            <div className="form-group">
              <label>{t('nav.dealers')}</label>
              <select value={upload.dealer} onChange={(e) => setUpload({ ...upload, dealer: e.target.value })} required>
                <option value="">{t('select')}</option>
                {dealers.map((d) => <option key={d._id} value={d._id}>{d.dealerName}</option>)}
              </select>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label>{t('video.file')}</label>
              <input type="file" accept="video/*" onChange={(e) => setUpload({ ...upload, video: e.target.files?.[0] })} required />
            </div>
            <div className="form-group">
              <label>{t('video.thumb')}</label>
              <input type="file" accept="image/*" onChange={(e) => setUpload({ ...upload, thumbnail: e.target.files?.[0] })} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('video.caption')}</label>
            <textarea rows={2} value={upload.caption} onChange={(e) => setUpload({ ...upload, caption: e.target.value })} />
          </div>
          <div className="form-group">
            <label>{t('video.hashtags')}</label>
            <input value={upload.hashtags} onChange={(e) => setUpload({ ...upload, hashtags: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={busy === 'upload'}><Clapperboard size={16} /> {t('video.sendReview')}</button>
        </form>
      )}

      <div className={`video-split ${open ? 'open' : ''}`}>
        <div className="card">
          <h3>{t('video.queue')}</h3>
          {!rows.length ? <p className="empty-state">{t('video.empty')}</p> : (
            <div className="video-list">
              {rows.map((row) => (
                <button key={row._id} type="button" className={`video-row ${open?._id === row._id ? 'on' : ''}`} onClick={() => setOpen(row)}>
                  <strong>{row.dealer?.dealerName || '—'}</strong>
                  <span>{row.caption || t('video.noCaption')}</span>
                  <em className={`badge badge-${row.status}`}>{t(`video.st.${row.status}`) || row.status}</em>
                  {['queued', 'rendering'].includes(row.status) && (
                    <div className="video-bar"><i style={{ width: `${row.renderProgress || 2}%` }} /></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {open && (
          <div className="card video-editor">
            <h3>{open.dealer?.dealerName}</h3>
            <div className="form-group">
              <label>{t('video.compare')}</label>
              <select value={compare} onChange={(e) => setCompare(e.target.value)}>
                <option value="original">{t('video.original')}</option>
                {(open.versions || []).map((_, i) => (
                  <option key={i} value={`v${i}`}>{t('video.version')} {i + 1}</option>
                ))}
                <option value="edited">{t('video.current')}</option>
              </select>
            </div>
            <video key={previewSrc} src={previewSrc} controls poster={mediaUrl(open.thumbnailUrl)} />
            <p className="video-meta">{t(`video.st.${open.status}`)} · {open.durationSec ? `${Math.round(open.durationSec)}s` : ''}</p>
            {open.changeRequest && <div className="alert alert-error">{open.changeRequest}</div>}
            {open.errorMessage && <div className="alert alert-error">{open.errorMessage}</div>}

            {mode === 'super' && (
              <>
                <div className="video-actions">
                  {templates.length > 0 && (
                    <>
                      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                        <option value="">{t('video.pickTemplate')}</option>
                        {templates.map((tpl) => <option key={tpl._id} value={tpl._id}>{tpl.name}</option>)}
                      </select>
                      <button type="button" className="btn btn-outline" onClick={() => templateId && run(async () => { const res = await videoAPI.applyTemplate(open._id, templateId); setOpen(res.data.data); setMsg(t('video.tplOn')); })}>{t('video.applyTpl')}</button>
                    </>
                  )}
                  <button type="button" className="btn btn-outline" onClick={() => studioAPI.ai({ task: 'caption', caption }).then((r) => setMsg(r.data.data || r.data.message))}>{t('video.aiCaption')}</button>
                  <button type="button" className="btn btn-outline" onClick={() => studioAPI.ai({ task: 'hashtags', caption }).then((r) => setMsg(r.data.data || r.data.message))}>{t('video.aiHash')}</button>
                </div>
                <div className="form-group"><label>{t('video.caption')}</label><textarea rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
                <div className="form-group"><label>{t('video.hashtags')}</label><input value={hashtags} onChange={(e) => setHashtags(e.target.value)} /></div>
                <div className="form-row">
                  <div className="form-group"><label>{t('video.trimStart')}</label><input type="number" min="0" step="0.1" value={spec.trimStart} onChange={(e) => setSpec({ ...spec, trimStart: Number(e.target.value) })} /></div>
                  <div className="form-group"><label>{t('video.trimEnd')}</label><input type="number" min="0" step="0.1" value={spec.trimEnd} onChange={(e) => setSpec({ ...spec, trimEnd: Number(e.target.value) })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('video.aspect')}</label>
                    <select value={spec.aspect} onChange={(e) => setSpec({ ...spec, aspect: e.target.value })}>
                      <option value="original">Original</option>
                      <option value="9:16">9:16</option>
                      <option value="1:1">1:1</option>
                      <option value="16:9">16:9</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t('video.res')}</label>
                    <select value={spec.resolution} onChange={(e) => setSpec({ ...spec, resolution: e.target.value })}>
                      <option value="original">Original</option>
                      <option value="1080">1080p</option>
                      <option value="720">720p</option>
                      <option value="480">480p</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('video.rotate')}</label>
                    <select value={spec.rotate} onChange={(e) => setSpec({ ...spec, rotate: Number(e.target.value) })}>
                      <option value={0}>0</option><option value={90}>90</option><option value={180}>180</option><option value={270}>270</option>
                    </select>
                  </div>
                  <label className="chk"><input type="checkbox" checked={spec.flipH} onChange={(e) => setSpec({ ...spec, flipH: e.target.checked })} /> {t('video.flipH')}</label>
                  <label className="chk"><input type="checkbox" checked={spec.flipV} onChange={(e) => setSpec({ ...spec, flipV: e.target.checked })} /> {t('video.flipV')}</label>
                  <label className="chk"><input type="checkbox" checked={spec.compress} onChange={(e) => setSpec({ ...spec, compress: e.target.checked })} /> {t('video.compress')}</label>
                  <label className="chk"><input type="checkbox" checked={spec.muteOriginal} onChange={(e) => setSpec({ ...spec, muteOriginal: e.target.checked })} /> {t('video.mute')}</label>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>{t('video.volOrig')}</label><input type="range" min="0" max="2" step="0.05" value={spec.originalVolume} onChange={(e) => setSpec({ ...spec, originalVolume: Number(e.target.value) })} /></div>
                  <div className="form-group"><label>{t('video.volMusic')}</label><input type="range" min="0" max="2" step="0.05" value={spec.musicVolume} onChange={(e) => setSpec({ ...spec, musicVolume: Number(e.target.value) })} /></div>
                </div>
                {(spec.texts || []).map((layer, i) => (
                  <div className="form-row" key={i}>
                    <div className="form-group"><label>{t('video.text')} {i + 1}</label><input value={layer.text} onChange={(e) => setText(i, { text: e.target.value })} /></div>
                    <div className="form-group"><label>{t('video.size')}</label><input type="number" value={layer.size} onChange={(e) => setText(i, { size: Number(e.target.value) })} /></div>
                    <div className="form-group"><label>{t('video.color')}</label><input type="color" value={layer.color} onChange={(e) => setText(i, { color: e.target.value })} /></div>
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setSpec({ ...spec, texts: [...(spec.texts || []), { text: '', size: 32, color: '#ffffff', x: 0.1, y: 0.8 }] })}>{t('video.addText')}</button>
                <div className="asset-grid">
                  {[['watermark', t('video.logo')], ['intro', t('video.intro')], ['outro', t('video.outro')], ['music', t('video.music')], ['srt', t('video.srt')], ['thumbnail', t('video.thumb')]].map(([k, lab]) => (
                    <label key={k}>{lab}<input type="file" onChange={(e) => setAssets({ ...assets, [k]: e.target.files?.[0] })} /></label>
                  ))}
                  <label>{t('video.merge')}<input type="file" accept="video/*" multiple onChange={(e) => setAssets({ ...assets, merge: Array.from(e.target.files || []) })} /></label>
                </div>
                <div className="video-actions">
                  <button type="button" className="btn btn-outline" disabled={!!busy} onClick={saveDraft}>{t('video.saveDraft')}</button>
                  <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => { setBusy('render'); run(async () => { await saveDraft(); const res = await videoAPI.sendAm(open._id); setMsg(res.data.message || t('video.queued')); }); }}><Play size={15} /> {t('video.renderAm')}</button>
                </div>
                {open.status === 'ready_to_publish' && (
                  <div className="video-publish">
                    <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="both">{t('social.both')}</option>
                    </select>
                    <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                    <button type="button" className="btn btn-primary" onClick={() => setAsk('publish')}>{t('video.publish')}</button>
                    <button type="button" className="btn btn-outline" onClick={() => videoAPI.analytics(open._id).then((r) => setStats(r.data.data)).catch((e) => setErr(e.response?.data?.message || t('video.fail')))}>{t('video.analytics')}</button>
                  </div>
                )}
                {(open.status === 'failed' || (open.publications || []).some((p) => p.status === 'failed')) && (
                  <button type="button" className="btn btn-primary" onClick={() => { setBusy('retry'); run(async () => { const res = await videoAPI.retry(open._id, { platform: open.platform || 'both', attempts: 3 }); setOpen(res.data.data); setMsg(res.data.message); }); }}>{t('video.retry')}</button>
                )}
                {(open.publications || []).length > 0 && (
                  <div className="pin-list">
                    {(open.publications || []).map((p) => (
                      <p key={p.platform}>{p.platform}: {p.status} {(p.attempts || []).map((a) => (a.ok ? '✓' : '✗')).join(' ')}</p>
                    ))}
                  </div>
                )}
              </>
            )}

            {mode === 'am' && (
              <div className="pin-box">
                <h4>{t('video.pins')}</h4>
                <div className="form-row">
                  <div className="form-group"><label>{t('video.at')}</label><input type="number" min="0" step="0.1" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="00:14" /></div>
                  <div className="form-group"><label>{t('notes')}</label><input value={note} onChange={(e) => setNote(e.target.value)} /></div>
                </div>
                <button type="button" className="btn btn-outline" onClick={() => run(async () => { const res = await videoAPI.comment(open._id, { atSec: Number(pin), text: note }); setOpen(res.data.data); setNote(''); setMsg(t('video.pinOk')); })}>{t('video.addPin')}</button>
                {open.status === 'waiting_am' && (
                  <div className="video-actions">
                    <textarea rows={2} placeholder={t('video.changes')} value={comment} onChange={(e) => setComment(e.target.value)} />
                    <button type="button" className="btn btn-primary" onClick={() => run(async () => { await videoAPI.review(open._id, { action: 'approve' }); setMsg(t('video.amOk')); })}>{t('video.approve')}</button>
                    <button type="button" className="btn btn-outline" onClick={() => run(async () => { await videoAPI.review(open._id, { action: 'changes', comment }); setMsg(t('video.amBack')); })}>{t('video.request')}</button>
                  </div>
                )}
              </div>
            )}

            {(open.comments || []).length > 0 && (
              <div className="pin-list">
                <h4>{t('video.pins')}</h4>
                {open.comments.map((c, i) => (
                  <p key={i}><b>{Number(c.atSec).toFixed(1)}s</b> — {c.text} <small>{c.author?.name || ''}</small></p>
                ))}
              </div>
            )}

            {stats && (
              <div className="stats-box">
                <h4>{t('video.analytics')}</h4>
                {stats.facebook && <p>Facebook · reach {stats.facebook.reach || 0} · likes {stats.facebook.likes || 0} · comments {stats.facebook.comments || 0} · shares {stats.facebook.shares || 0}</p>}
                {stats.instagram && <p>Instagram · views {stats.instagram.views || 0} · reach {stats.instagram.reach || 0} · likes {stats.instagram.likes || 0} · comments {stats.instagram.comments || 0} · saves {stats.instagram.saves || 0}</p>}
              </div>
            )}

            {open.versions?.length > 0 && (
              <div className="video-versions">
                <h4>{t('video.history')}</h4>
                {open.versions.map((v, i) => (
                  <div key={i} className="ver-row">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setCompare(`v${i}`)}>{t('video.version')} {i + 1}</button>
                    {mode === 'super' && <button type="button" className="btn btn-primary btn-sm" onClick={() => run(async () => { const res = await videoAPI.restore(open._id, i); setOpen(res.data.data); setMsg(res.data.message); })}>{t('video.restore')}</button>}
                    <small>{new Date(v.createdAt).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            )}
            {trail.length > 0 && (
              <div className="pin-list">
                <h4>{t('video.trail')}</h4>
                {trail.map((row) => (
                  <p key={row._id} className="trail-line">{new Date(row.at).toLocaleString()} · {row.actorName || 'system'} · {row.action}{row.detail ? ` — ${row.detail}` : ''}</p>
                ))}
              </div>
            )}
            {(open.editedUrl || open.originalUrl) && (
              <a className="btn btn-outline btn-sm" href={mediaUrl(open.editedUrl || open.originalUrl)} download>
                <Download size={14} /> {t('video.download')}
              </a>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={ask === 'publish'}
        title={t('video.publish')}
        message={t('video.confirmPub')}
        busy={busy === 'pub'}
        onClose={() => setAsk(null)}
        onConfirm={() => { setBusy('pub'); run(async () => { const res = await videoAPI.publish(open._id, { platform, scheduledAt }); setMsg(res.data.message || t('video.published')); }); }}
      />
    </div>
  );
};

export default VideoDesk;
