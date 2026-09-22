import { useEffect, useRef, useState } from 'react';
import { postersAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';
import { mediaUrl } from '../utils/mediaUrl';
import PosterLightbox from '../shared/components/PosterLightbox';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import '../shared/pages/posters.css';

const AmSheetUpload = () => {
  const { t } = useLang();
  const [sheets, setSheets] = useState([]);
  const [posters, setPosters] = useState([]);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [ask, setAsk] = useState(null);
  const sheetFile = useRef(null);

  const load = () => {
    postersAPI.sheets().then((res) => setSheets(res.data.data || []));
    postersAPI.getAll().then((res) => setPosters(res.data.data || []));
  };

  useEffect(() => {
    load();
  }, []);

  const onSheet = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    sheetFile.current = file;
    setError('');
    setAsk({
      kind: 'sheet',
      title: t('posters.amTitle'),
      message: t('posters.confirmSheet').replace('{file}', file.name),
    });
  };

  const uploadSheet = async () => {
    const file = sheetFile.current;
    if (!file) {
      setError(t('posters.needSheet'));
      setAsk(null);
      return;
    }
    setError('');
    setMsg('');
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true);
    try {
      await postersAPI.sendSheet(fd);
      setMsg(t('posters.sent'));
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('posters.parseFail'));
    } finally {
      setBusy(false);
      setAsk(null);
      sheetFile.current = null;
    }
  };

  const review = async (id, status) => {
    setBusyId(id);
    try {
      await postersAPI.review(id, { status });
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('posters.fail'));
    } finally {
      setBusyId('');
      setAsk(null);
    }
  };

  const sheetStatus = (s) => (s === 'done' ? 'generated' : s);

  return (
    <div className="poster-page">
      <div className="page-header">
        <div>
          <span className="poster-kicker">Swaraj · Area</span>
          <h1>{t('posters.amTitle')}</h1>
          <p className="page-subtitle">{t('posters.amSub')}</p>
        </div>
      </div>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="poster-upload-hero">
        <label>{t('posters.sheet')}</label>
        <input type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={onSheet} style={{ display: 'block', marginTop: 8 }} />
        <p className="muted" style={{ marginTop: 8 }}>{t('posters.amHint')}</p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 className="card-title">{t('posters.sentList')}</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t('posters.sheet')}</th>
                <th>{t('posters.rows')}</th>
                <th>{t('status')}</th>
                <th>{t('date')}</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((s) => (
                <tr key={s._id}>
                  <td>{s.fileName}</td>
                  <td>{s.rows?.length || 0}</td>
                  <td>
                    <span className={`badge badge-${s.status === 'pending' ? 'pending' : 'approved'}`}>
                      {t(`posters.st.${sheetStatus(s.status)}`)}
                    </span>
                  </td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sheets.length && <p className="empty-state">{t('noData')}</p>}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">{t('posters.amReview')}</h3>
        <p className="muted">{t('posters.amReviewHint')}</p>
        <div className="poster-mosaic" style={{ marginTop: '0.85rem' }}>
          {posters.map((p, i) => (
            <div key={p._id} className="poster-tile">
              <div className="poster-tile-top">
                <span className="muted" style={{ fontSize: '0.72rem' }}>{p.sheet?.fileName || ''}</span>
                <span className={`badge badge-${p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending'}`}>
                  {t(`posters.pst.${p.status}`)}
                </span>
              </div>
              <button type="button" className="poster-tile-shot" onClick={() => setPreview(i)}>
                <img src={mediaUrl(p.url)} alt={p.dealerName} />
              </button>
              <div className="poster-tile-body">
                <strong>{p.dealerName}</strong>
                <div className="poster-tile-btns">
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setPreview(i)}>{t('posters.fullPreview')}</button>
                  {p.status === 'pending_am' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={busyId === p._id}
                        onClick={() => setAsk({
                          title: t('posters.approve'),
                          message: t('posters.confirmApprove').replace('{name}', p.dealerName || ''),
                          run: () => review(p._id, 'approved'),
                        })}
                      >
                        {t('posters.approve')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={busyId === p._id}
                        onClick={() => setAsk({
                          title: t('posters.reject'),
                          message: t('posters.confirmReject').replace('{name}', p.dealerName || ''),
                          danger: true,
                          run: () => review(p._id, 'rejected'),
                        })}
                      >
                        {t('posters.reject')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {!posters.length && <p className="empty-state">{t('posters.noReview')}</p>}
      </div>
      <PosterLightbox posters={posters} index={preview} onIndex={setPreview} onClose={() => setPreview(null)}>
        {posters[preview]?.status === 'pending_am' ? (
          <>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={busyId === posters[preview]._id}
              onClick={() => setAsk({
                title: t('posters.approve'),
                message: t('posters.confirmApprove').replace('{name}', posters[preview].dealerName || ''),
                run: () => review(posters[preview]._id, 'approved'),
              })}
            >
              {t('posters.approve')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              disabled={busyId === posters[preview]._id}
              onClick={() => setAsk({
                title: t('posters.reject'),
                message: t('posters.confirmReject').replace('{name}', posters[preview].dealerName || ''),
                danger: true,
                run: () => review(posters[preview]._id, 'rejected'),
              })}
            >
              {t('posters.reject')}
            </button>
          </>
        ) : null}
      </PosterLightbox>
      <ConfirmDialog
        open={!!ask}
        title={ask?.title}
        message={ask?.message}
        danger={ask?.danger}
        busy={busy}
        onClose={() => !busy && setAsk(null)}
        onConfirm={() => {
          if (ask?.kind === 'sheet') uploadSheet();
          else ask?.run?.();
        }}
      />
    </div>
  );
};

export default AmSheetUpload;
