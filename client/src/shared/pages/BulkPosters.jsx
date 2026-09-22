import { useEffect, useState } from 'react';
import { postersAPI, settingsAPI } from '../../services/api';
import { useLang } from '../context/LanguageContext';
import { composePosterBlob, loadPosterImage, cellFromRow, guessPosterMapping } from '../../utils/composePoster';
import { mediaUrl } from '../../utils/mediaUrl';
import PosterLightbox from '../components/PosterLightbox';
import PosterEditModal from '../components/PosterEditModal';
import ConfirmDialog from '../components/ConfirmDialog';
import './posters.css';

const FIELDS = [
  { key: 'headerText', labelKey: 'lh.header' },
  { key: 'headerSub', labelKey: 'lh.headerSub' },
  { key: 'footerLeft', labelKey: 'lh.footerL' },
  { key: 'footerRight', labelKey: 'lh.footerR' },
];

const BulkPosters = () => {
  const { t } = useLang();
  const [sheets, setSheets] = useState([]);
  const [job, setJob] = useState(null);
  const [mapping, setMapping] = useState({ headerText: '', headerSub: '', footerLeft: '', footerRight: '' });
  const [picture, setPicture] = useState('');
  const [letterhead, setLetterhead] = useState(null);
  const [posters, setPosters] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState([]);
  const [edit, setEdit] = useState(null);
  const [ask, setAsk] = useState(null);
  const [progress, setProgress] = useState(null);

  const loadSheets = () => postersAPI.sheets().then((res) => setSheets(res.data.data || []));
  const loadPosters = (sheetId) => {
    postersAPI.getAll(sheetId ? { sheetId } : {}).then((res) => {
      setPosters(res.data.data || []);
      setSelected([]);
    });
  };

  useEffect(() => {
    settingsAPI.get().then((res) => {
      const lh = res.data.data?.letterhead;
      setLetterhead(lh || {});
      if (lh?.imageUrl) setPicture(mediaUrl(lh.imageUrl));
    });
    loadSheets();
    loadPosters();
  }, []);

  const openJob = async (s) => {
    setError('');
    setMsg('');
    try {
      const res = await postersAPI.sheet(s._id);
      const full = res.data.data || s;
      setJob(full);
      setMapping(full.mapping && full.mapping.headerText ? full.mapping : guessPosterMapping(full.headers || []));
      loadPosters(full._id);
    } catch (err) {
      setError(err.response?.data?.message || t('posters.parseFail'));
    }
  };

  const onPicture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicture(URL.createObjectURL(file));
  };

  const generate = async () => {
    if (!job?.rows?.length) {
      setError(t('posters.needSheet'));
      return;
    }
    if (!picture) {
      setError(t('posters.needPic'));
      return;
    }
    setAsk(null);
    setBusy(true);
    setError('');
    setMsg('');
    const total = job.rows.length;
    setProgress({ done: 0, total, label: t('posters.progressPrep') });
    try {
      const img = await loadPosterImage(picture);
      const fd = new FormData();
      fd.append('sheetId', job._id);
      for (let i = 0; i < total; i += 1) {
        const row = job.rows[i];
        const values = {
          headerText: cellFromRow(row, mapping.headerText),
          headerSub: cellFromRow(row, mapping.headerSub),
          footerLeft: cellFromRow(row, mapping.footerLeft),
          footerRight: cellFromRow(row, mapping.footerRight),
        };
        setProgress({ done: i, total, label: t('posters.progressMake').replace('{i}', String(i + 1)).replace('{n}', String(total)).replace('{name}', values.headerText || '') });
        await new Promise((r) => requestAnimationFrame(() => r()));
        const blob = await composePosterBlob(picture, letterhead, values, img);
        fd.append('files', blob, `dealer-${i + 1}-8k.jpg`);
        fd.append('dealerName', values.headerText || `Dealer ${i + 1}`);
      }
      setProgress({ done: total, total, label: t('posters.progressSave') });
      await postersAPI.save(fd);
      setMsg(t('posters.done').replace('{n}', String(total)));
      loadSheets();
      loadPosters(job._id);
      setJob((j) => (j ? { ...j, status: 'generated' } : j));
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('posters.fail'));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const sendAm = async () => {
    setAsk(null);
    setBusy(true);
    setError('');
    try {
      await postersAPI.sendToAm(job._id);
      setMsg(t('posters.sentAm').replace('{name}', job.areaManager?.name || ''));
      loadSheets();
      loadPosters(job._id);
      setJob((j) => (j ? { ...j, status: 'sent_am' } : j));
    } catch (err) {
      setError(err.response?.data?.message || t('posters.fail'));
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async (payload) => {
    setBusy(true);
    try {
      await postersAPI.bulkDelete(payload);
      setMsg(t('posters.deletedOk'));
      loadPosters(job?._id);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.message || t('posters.fail'));
    } finally {
      setBusy(false);
      setAsk(null);
    }
  };

  const saveEditDone = () => {
    setEdit(null);
    setMsg(t('posters.edited'));
    loadPosters(job?._id);
  };

  const toggle = (id) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const headers = job?.headers || [];
  const rows = job?.rows || [];
  const allIds = posters.map((p) => p._id);
  const allOn = posters.length > 0 && selected.length === posters.length;
  const sample = rows[0];
  const sampleVals = {
    headerText: cellFromRow(sample, mapping.headerText),
    headerSub: cellFromRow(sample, mapping.headerSub),
    footerLeft: cellFromRow(sample, mapping.footerLeft),
    footerRight: cellFromRow(sample, mapping.footerRight),
  };
  const headerPct = letterhead?.headerPct ?? 16;
  const footerPct = letterhead?.footerPct ?? 11;
  const initials = (name) => String(name || 'AM').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="poster-page">
      <div className="page-header">
        <div>
          <span className="poster-kicker">Swaraj · HQ</span>
          <h1>{t('posters.title')}</h1>
          <p className="page-subtitle">{t('posters.sub')}</p>
        </div>
      </div>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 className="card-title">{t('posters.inbox')}</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t('dealers.am')}</th>
                <th>{t('posters.sheet')}</th>
                <th>{t('posters.rows')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((s) => (
                <tr key={s._id} className="poster-inbox-row">
                  <td>
                    <div className="poster-am">
                      <span className="poster-am-mark">{initials(s.areaManager?.name)}</span>
                      <span>{s.areaManager?.name || '—'}</span>
                    </div>
                  </td>
                  <td>{s.fileName}</td>
                  <td>{s.rows?.length || 0}</td>
                  <td>
                    <span className={`badge badge-${s.status === 'pending' ? 'pending' : 'approved'}`}>
                      {t(`posters.st.${s.status === 'done' ? 'generated' : s.status}`)}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => openJob(s)}>
                      {t('posters.open')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sheets.length && <p className="empty-state">{t('posters.noSheets')}</p>}
        </div>
      </div>

      {job && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">
            {job.areaManager?.name} · {job.fileName}
          </h3>
          <div className="poster-studio">
            <div>
              <div className="poster-drop">
                <label>{t('posters.picture')}</label>
                <input type="file" accept="image/*" onChange={onPicture} />
              </div>
              {!!headers.length && (
                <div className="form-row" style={{ marginTop: '1rem' }}>
                  {FIELDS.map((f) => (
                    <div className="form-group" key={f.key}>
                      <label>{t(f.labelKey)}</label>
                      <select value={mapping[f.key] || ''} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}>
                        <option value="">—</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
              <div className="poster-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={busy}
                  onClick={() => setAsk({
                    title: t('posters.make'),
                    message: t('posters.confirmMake').replace('{n}', String(rows.length)).replace('{name}', job.areaManager?.name || ''),
                    run: generate,
                  })}
                >
                  {t('posters.make')}
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  disabled={busy}
                  onClick={() => setAsk({
                    title: t('posters.sendAm'),
                    message: t('posters.confirmSend').replace('{n}', String(posters.length)).replace('{name}', job.areaManager?.name || ''),
                    run: sendAm,
                  })}
                >
                  {t('posters.sendAm')}
                </button>
              </div>
              {progress && (
                <div className="poster-progress">
                  <p>{progress.label}</p>
                  <div className="poster-progress-track">
                    <div className="poster-progress-fill" style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} />
                  </div>
                </div>
              )}
              {sample && (
                <div className="poster-sample">
                  {t('posters.mapPreview')}: <strong>{sampleVals.headerText || '—'}</strong>
                  {sampleVals.headerSub ? ` · ${sampleVals.headerSub}` : ''}
                  {sampleVals.footerLeft ? ` · ${sampleVals.footerLeft}` : ''}
                  {sampleVals.footerRight ? ` · ${sampleVals.footerRight}` : ''}
                </div>
              )}
            </div>
            <div className="poster-live">
              {picture ? <img src={picture} alt="" /> : <div style={{ minHeight: 240 }} />}
              <div className="poster-live-band top" style={{ height: `${headerPct}%`, background: letterhead?.headerBg || 'rgba(122, 8, 18, 0.72)' }} />
              <div className="poster-live-band bot" style={{ height: `${footerPct}%`, background: letterhead?.footerBg || 'rgba(28, 25, 23, 0.72)' }} />
              <div className="poster-live-line name" style={{ top: '3.5%', left: '4%', right: '8%', fontSize: '1.15rem' }}>{sampleVals.headerText}</div>
              <div className="poster-live-line" style={{ top: '9.5%', left: '4%', right: '8%', fontSize: '0.78rem' }}>{sampleVals.headerSub}</div>
              <div className="poster-live-line" style={{ bottom: '4.5%', left: '4%', width: '42%', fontSize: '0.78rem' }}>{sampleVals.footerLeft}</div>
              <div className="poster-live-line" style={{ bottom: '4.5%', right: '4%', width: '42%', textAlign: 'right', fontSize: '0.78rem' }}>{sampleVals.footerRight}</div>
            </div>
          </div>
          {rows.length ? (
            <div className="table-wrapper" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 12).map((r, i) => (
                    <tr key={i}>{headers.map((h) => <td key={h}>{String(r[h])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      <div className="card">
        <div className="poster-toolbar">
          <h3 className="card-title">{t('posters.mine')}</h3>
          <div className="poster-actions">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <input type="checkbox" checked={allOn} onChange={() => setSelected(allOn ? [] : allIds)} />
              {t('selectAll')}
            </label>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={!selected.length || busy}
              onClick={() => setAsk({
                title: t('deleteSelected'),
                message: t('posters.confirmDeleteN').replace('{n}', String(selected.length)),
                danger: true,
                run: () => runDelete({ ids: selected }),
              })}
            >
              {t('deleteSelected')} ({selected.length})
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              disabled={!posters.length || busy}
              onClick={() => setAsk({
                title: t('deleteAll'),
                message: t('posters.confirmDeleteAll').replace('{n}', String(posters.length)),
                danger: true,
                run: () => runDelete(job?._id ? { all: true, sheetId: job._id } : { ids: allIds }),
              })}
            >
              {t('deleteAll')}
            </button>
          </div>
        </div>
        <div className="poster-mosaic">
          {posters.map((p, i) => (
            <div key={p._id} className="poster-tile">
              <div className="poster-tile-top">
                <label>
                  <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggle(p._id)} />
                </label>
                <span className={`badge badge-${p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending'}`}>
                  {t(`posters.pst.${p.status || 'draft'}`)}
                </span>
              </div>
              <button type="button" className="poster-tile-shot" onClick={() => setPreview(i)}>
                <img src={mediaUrl(p.url)} alt={p.dealerName} />
              </button>
              <div className="poster-tile-body">
                <strong>{p.dealerName}</strong>
                <div className="poster-tile-btns">
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setPreview(i)}>{t('posters.fullPreview')}</button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setEdit(p)}>{t('edit')}</button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setAsk({
                      title: t('delete'),
                      message: t('posters.confirmDeleteOne').replace('{name}', p.dealerName || ''),
                      danger: true,
                      run: () => runDelete({ ids: [p._id] }),
                    })}
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!posters.length && <p className="empty-state">{t('noData')}</p>}
      </div>

      <PosterLightbox posters={posters} index={preview} onIndex={setPreview} onClose={() => setPreview(null)}>
        {posters[preview] ? (
          <>
            <button
              type="button"
              className="btn btn-sm poster-lb-btn"
              onClick={() => { const p = posters[preview]; setPreview(null); setEdit(p); }}
            >
              {t('edit')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                const p = posters[preview];
                setAsk({
                  title: t('delete'),
                  message: t('posters.confirmDeleteOne').replace('{name}', p.dealerName || ''),
                  danger: true,
                  run: () => runDelete({ ids: [p._id] }),
                });
              }}
            >
              {t('delete')}
            </button>
          </>
        ) : null}
      </PosterLightbox>

      {edit && (
        <PosterEditModal
          poster={edit}
          onClose={() => setEdit(null)}
          onSaved={saveEditDone}
        />
      )}

      <ConfirmDialog
        open={!!ask}
        title={ask?.title}
        message={ask?.message}
        danger={ask?.danger}
        busy={busy}
        onClose={() => !busy && setAsk(null)}
        onConfirm={() => ask?.run?.()}
      />
    </div>
  );
};

export default BulkPosters;
