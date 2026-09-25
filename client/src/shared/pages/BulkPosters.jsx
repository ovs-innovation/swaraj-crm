import { useEffect, useState } from 'react';
import { postersAPI, settingsAPI } from '../../services/api';
import { useLang } from '../context/LanguageContext';
import { composePosterBlob, loadPosterImage, cellFromRow, guessPosterMapping } from '../../utils/composePoster';
import { mediaUrl } from '../../utils/mediaUrl';
import PosterLightbox from '../components/PosterLightbox';
import ConfirmDialog from '../components/ConfirmDialog';
import LetterheadEditor from '../../admin/LetterheadEditor';
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
  const [ask, setAsk] = useState(null);
  const [progress, setProgress] = useState(null);
  const [design, setDesign] = useState(false);
  const templateSrc = picture || (letterhead?.imageUrl ? mediaUrl(letterhead.imageUrl) : '');

  const loadSheets = () => postersAPI.sheets().then((res) => setSheets(res.data.data || [])).catch((err) => setError(err.response?.data?.message || t('loadFail')));
  const loadPosters = (sheetId) => {
    postersAPI.getAll(sheetId ? { sheetId } : {}).then((res) => setPosters(res.data.data || [])).catch(() => {});
  };

  useEffect(() => {
    settingsAPI.get().then((res) => {
      const lh = res.data.data?.letterhead;
      setLetterhead(lh || {});
      if (lh?.imageUrl) setPicture(mediaUrl(lh.imageUrl));
    }).catch(() => {});
    loadSheets();
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

  const onPicture = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await settingsAPI.uploadLetterhead(fd);
      const lh = res.data.data?.letterhead || {};
      setLetterhead(lh);
      setPicture(lh.imageUrl ? mediaUrl(lh.imageUrl) : URL.createObjectURL(file));
    } catch (err) {
      setError(err.response?.data?.message || t('posters.fail'));
    } finally {
      setBusy(false);
    }
  };

  const generate = async (lh = letterhead, src = templateSrc) => {
    if (!job?.rows?.length) return setError(t('posters.needSheet'));
    if (!src) return setError(t('posters.needTpl'));
    setAsk(null);
    setBusy(true);
    setError('');
    setMsg('');
    const total = job.rows.length;
    setProgress({ done: 0, total });
    try {
      await postersAPI.saveSheet(job._id, { rows: job.rows, mapping });
      if (posters.length) await postersAPI.bulkDelete({ all: true, sheetId: job._id });
      const img = await loadPosterImage(src);
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
        setProgress({ done: i + 1, total });
        await new Promise((r) => requestAnimationFrame(() => r()));
        const blob = await composePosterBlob(src, lh, values, img);
        fd.append('files', blob, `dealer-${i + 1}-8k.jpg`);
        fd.append('dealerName', values.headerText || `Dealer ${i + 1}`);
      }
      await postersAPI.save(fd);
      setMsg(t('posters.doneExcel').replace('{n}', String(total)));
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
    try {
      await postersAPI.sendToAm(job._id);
      setMsg(t('posters.sentAm').replace('{name}', job.areaManager?.name || ''));
      loadSheets();
      loadPosters(job._id);
    } catch (err) {
      setError(err.response?.data?.message || t('posters.fail'));
    } finally {
      setBusy(false);
    }
  };

  const setCell = (rowIndex, col, value) => {
    setJob({
      ...job,
      rows: job.rows.map((row, i) => (i === rowIndex ? { ...row, [col]: value } : row)),
    });
  };

  const headers = job?.headers || [];
  const rows = job?.rows || [];
  const sample = rows[0];
  const sampleVals = {
    headerText: cellFromRow(sample, mapping.headerText),
    headerSub: cellFromRow(sample, mapping.headerSub),
    footerLeft: cellFromRow(sample, mapping.footerLeft),
    footerRight: cellFromRow(sample, mapping.footerRight),
  };
  const headerPct = letterhead?.headerPct ?? 16;
  const footerPct = letterhead?.footerPct ?? 11;
  const byAm = sheets.reduce((acc, s) => {
    const key = s.areaManager?._id || s.areaManager?.name || 'am';
    if (!acc[key]) acc[key] = { name: s.areaManager?.name || '—', items: [] };
    acc[key].items.push(s);
    return acc;
  }, {});

  return (
    <div className="poster-page">
      <div className="page-header">
        <div>
          <h1>{t('posters.title')}</h1>
          <p className="page-subtitle">{job ? `${job.areaManager?.name || ''} · ${job.fileName}` : t('posters.subSimple')}</p>
        </div>
        {job && (
          <button type="button" className="btn btn-outline" onClick={() => { setJob(null); setPosters([]); setMsg(''); }}>
            {t('posters.backSheets')}
          </button>
        )}
      </div>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!job && (
        <>
          <ol className="poster-how">
            <li>{t('posters.how1')}</li>
            <li>{t('posters.how2')}</li>
            <li>{t('posters.how3')}</li>
          </ol>
          <div className="card">
            <h3 className="card-title">{t('posters.pickSheet')}</h3>
            {Object.entries(byAm).map(([id, g]) => (
              <div key={id} className="poster-am-block">
                <p className="poster-am-head">
                  <span className="poster-am-mark">{g.name.slice(0, 1).toUpperCase()}</span>
                  {g.name}
                </p>
                <div className="poster-sheet-list">
                  {g.items.map((s) => (
                    <button key={s._id} type="button" className="poster-sheet-item" onClick={() => openJob(s)}>
                      <strong>{s.fileName}</strong>
                      <span>
                        {t('posters.dealersN').replace('{n}', String(s.rows?.length || 0))}
                        {' · '}
                        {t('posters.received')} {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                        {' · '}
                        {t(`posters.st.${s.status || 'pending'}`)}
                      </span>
                      <em>{t('posters.openThis')}</em>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!sheets.length && <p className="empty-state">{t('posters.noSheets')}</p>}
          </div>
        </>
      )}

      {job && (
        <>
          <div className="card poster-work">
            <div className="poster-live">
              {templateSrc ? <img src={templateSrc} alt="" /> : <div className="empty-state" style={{ minHeight: 220 }}>{t('posters.needTpl')}</div>}
              {templateSrc && (
                <>
                  <div className="poster-live-band top" style={{ height: `${headerPct}%`, background: letterhead?.headerBg || 'rgba(0, 90, 158, 0.72)' }} />
                  <div className="poster-live-band bot" style={{ height: `${footerPct}%`, background: letterhead?.footerBg || 'rgba(28, 25, 23, 0.72)' }} />
                  <div className="poster-live-line name" style={{ top: '3.5%', left: '4%', right: '8%', fontSize: '1.15rem' }}>{sampleVals.headerText}</div>
                  <div className="poster-live-line" style={{ top: '9.5%', left: '4%', right: '8%', fontSize: '0.78rem' }}>{sampleVals.headerSub}</div>
                  <div className="poster-live-line" style={{ bottom: '4.5%', left: '4%', width: '42%', fontSize: '0.78rem' }}>{sampleVals.footerLeft}</div>
                  <div className="poster-live-line" style={{ bottom: '4.5%', right: '4%', width: '42%', textAlign: 'right', fontSize: '0.78rem' }}>{sampleVals.footerRight}</div>
                </>
              )}
            </div>
            <div className="poster-work-side">
              <label className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                {t('posters.changePic')}
                <input type="file" accept="image/*" hidden onChange={onPicture} />
              </label>
              <button type="button" className="btn btn-outline" onClick={() => setDesign(true)}>{t('posters.editMain')}</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => generate()}>
                {t('posters.makeFromExcel')}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy || !posters.length}
                onClick={() => setAsk({ title: t('posters.sendAm'), message: t('posters.confirmSend').replace('{n}', String(posters.length)).replace('{name}', job.areaManager?.name || ''), run: sendAm })}
              >
                {t('posters.sendAm')} {job.areaManager?.name ? `· ${job.areaManager.name}` : ''}
              </button>
              {progress && <p className="poster-sample">{progress.done}/{progress.total}</p>}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">{t('posters.editExcel')}</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {FIELDS.map((f) => <th key={f.key}>{t(f.labelKey)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      {FIELDS.map((f) => {
                        const col = mapping[f.key];
                        return (
                          <td key={f.key}>
                            <input
                              className="poster-cell"
                              value={col ? String(r[col] ?? '') : ''}
                              onChange={(e) => col && setCell(i, col, e.target.value)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!!headers.length && (
              <details className="poster-map">
                <summary>{t('posters.columns')}</summary>
                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  {FIELDS.map((f) => (
                    <div className="form-group" key={f.key}>
                      <label>{t(f.labelKey)}</label>
                      <select value={mapping[f.key] || ''} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}>
                        <option value="">—</option>
                        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {!!posters.length && (
            <div className="card">
              <h3 className="card-title">{t('posters.mine')}</h3>
              <div className="poster-mosaic">
                {posters.map((p, i) => (
                  <div key={p._id} className="poster-tile">
                    <button type="button" className="poster-tile-shot" onClick={() => setPreview(i)}>
                      <img src={mediaUrl(p.url)} alt={p.dealerName} />
                    </button>
                    <div className="poster-tile-body">
                      <strong>{p.dealerName}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <PosterLightbox posters={posters} index={preview} onIndex={setPreview} onClose={() => setPreview(null)} />
      {design && (
        <div className="poster-design-wrap">
          <div className="poster-design-bar">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={async () => {
                const res = await settingsAPI.get();
                const lh = res.data.data?.letterhead || {};
                setLetterhead(lh);
                const src = lh.imageUrl ? mediaUrl(lh.imageUrl) : picture;
                if (lh.imageUrl) setPicture(src);
                setDesign(false);
                await generate(lh, src);
              }}
            >
              {t('posters.applyMain')}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setDesign(false)}>{t('cancel')}</button>
          </div>
          <LetterheadEditor />
        </div>
      )}
      <ConfirmDialog open={!!ask} title={ask?.title} message={ask?.message} busy={busy} onClose={() => !busy && setAsk(null)} onConfirm={() => ask?.run?.()} />
    </div>
  );
};

export default BulkPosters;
