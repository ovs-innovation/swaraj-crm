import { useEffect, useState, useRef } from 'react';
import JSZip from 'jszip';
import { Trash2 } from 'lucide-react';
import { postersAPI, settingsAPI } from '../../services/api';
import { useLang } from '../context/LanguageContext';
import { composePosterBlob, loadPosterImage, cellFromRow, guessPosterMapping, splitAddress, splitDealerName } from '../../utils/composePoster';
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
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState('');
  const [design, setDesign] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('4:5');
  const [showBrandBadges, setShowBrandBadges] = useState(true);
  const [topLeftLogo, setTopLeftLogo] = useState('/swaraj-gold-seal.svg');
  const [topRightLogo, setTopRightLogo] = useState('/swaraj-josh-badge.svg');
  const [footerBg, setFooterBg] = useState('#BA0C2F');
  const [dealerColor, setDealerColor] = useState('#00843D');
  const [dealerBg, setDealerBg] = useState('#ffffff');
  const [activeTab, setActiveTab] = useState('details');
  const [showEditor, setShowEditor] = useState(true);
  const [selectedRowIdx, setSelectedRowIdx] = useState(0);
  const [customDefaults, setCustomDefaults] = useState({
    headerText: 'Shree Motors',
    headerSub: 'MI Road, Jaipur\nRajasthan - 302001',
    footerLeft: '+91 91161 23451',
    footerRight: 'www.swarajtractors.com',
  });
  const leftLogoInputRef = useRef(null);
  const rightLogoInputRef = useRef(null);
  const templateSrc = picture || (letterhead?.imageUrl ? mediaUrl(letterhead.imageUrl) : '/default-poster-template.jpg');

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

  const confirmDeleteSheet = (s) => {
    if (!s?._id) return;
    setAsk({
      danger: true,
      title: t('posters.deleteSheet'),
      message: (t('posters.confirmDeleteSheet') || 'Delete {file}? This will permanently remove this Excel sheet and all associated posters for both Super Admin and Territory Manager. This cannot be undone.').replace('{file}', s.fileName || 'this Excel'),
      run: async () => {
        setBusy(true);
        setError('');
        try {
          await postersAPI.deleteSheet(s._id);
          setMsg(t('posters.sheetDeleted') || 'Excel sheet deleted successfully');
          if (job?._id === s._id) {
            setJob(null);
            setPosters([]);
          }
          await loadSheets();
        } catch (err) {
          setError(err.response?.data?.message || t('posters.fail'));
        } finally {
          setBusy(false);
          setAsk(null);
        }
      },
    });
  };

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
      const BATCH_SIZE = 20;
      let currentFd = new FormData();
      currentFd.append('sheetId', job._id);
      let batchCount = 0;

      for (let i = 0; i < total; i += 1) {
        const row = job.rows[i];
        const values = {
          headerText: cellFromRow(row, mapping.headerText) || customDefaults.headerText || '',
          headerSub: cellFromRow(row, mapping.headerSub) || customDefaults.headerSub || '',
          footerLeft: cellFromRow(row, mapping.footerLeft) || customDefaults.footerLeft || '',
          footerRight: cellFromRow(row, mapping.footerRight) || customDefaults.footerRight || 'www.swarajtractors.com',
        };
        setProgress({ done: i + 1, total });
        await new Promise((r) => requestAnimationFrame(() => r()));
        const blob = await composePosterBlob(src, lh, values, img, {
          aspectRatio,
          showBrandBadges,
          topLeftLogoSrc: topLeftLogo,
          topRightLogoSrc: topRightLogo,
          footerBg,
          dealerColor,
          dealerBg,
        });
        currentFd.append('files', blob, `dealer-${i + 1}-8k.jpg`);
        currentFd.append('dealerName', values.headerText || `Dealer ${i + 1}`);
        batchCount += 1;

        if (batchCount >= BATCH_SIZE || i === total - 1) {
          await postersAPI.save(currentFd);
          currentFd = new FormData();
          currentFd.append('sheetId', job._id);
          batchCount = 0;
        }
      }
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

  const downloadAllZip = async () => {
    if (!posters.length) return;
    setDownloadingZip(true);
    setZipProgress(`0 / ${posters.length}`);
    try {
      const zip = new JSZip();
      const folderName = (job?.fileName || 'Swaraj-Dealer-Posters')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const folder = zip.folder(folderName) || zip;

      const sanitize = (name) => String(name || 'dealer').replace(/[/\\?%*:|"<>]/g, '_').trim();

      const BATCH = 5;
      for (let i = 0; i < posters.length; i += BATCH) {
        const slice = posters.slice(i, i + BATCH);
        await Promise.all(
          slice.map(async (p, idx) => {
            const posterIndex = i + idx;
            const url = mediaUrl(p.url);
            try {
              const resp = await fetch(url, { mode: 'cors' });
              if (!resp.ok) throw new Error('Fetch failed');
              const blob = await resp.blob();
              const filename = `${String(posterIndex + 1).padStart(2, '0')}_${sanitize(p.dealerName)}.png`;
              folder.file(filename, blob);
            } catch (err) {
              console.warn('Direct fetch failed, falling back to canvas draw:', p.dealerName, err);
              try {
                const img = await loadPosterImage(url);
                const c = document.createElement('canvas');
                c.width = img.naturalWidth || 1080;
                c.height = img.naturalHeight || 1350;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const b = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
                const filename = `${String(posterIndex + 1).padStart(2, '0')}_${sanitize(p.dealerName)}.png`;
                folder.file(filename, b);
              } catch (err2) {
                console.error('Could not add poster to zip:', p.dealerName, err2);
              }
            }
            setZipProgress(`${Math.min(i + idx + 1, posters.length)} / ${posters.length}`);
          })
        );
      }

      setZipProgress('Generating ZIP...');
      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 4 },
        },
        (metadata) => {
          setZipProgress(`Compressing ${Math.round(metadata.percent)}%`);
        }
      );

      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
      setMsg(`Downloaded all ${posters.length} posters in ${folderName}.zip!`);
    } catch (err) {
      console.error('ZIP download error:', err);
      setError('Failed to download ZIP. Please try again.');
    } finally {
      setDownloadingZip(false);
      setZipProgress('');
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
  const currentRow = rows[selectedRowIdx] || rows[0];
  const sampleVals = {
    headerText: (currentRow && cellFromRow(currentRow, mapping.headerText)) || customDefaults.headerText,
    headerSub: (currentRow && cellFromRow(currentRow, mapping.headerSub)) || customDefaults.headerSub,
    footerLeft: (currentRow && cellFromRow(currentRow, mapping.footerLeft)) || customDefaults.footerLeft,
    footerRight: (currentRow && cellFromRow(currentRow, mapping.footerRight)) || customDefaults.footerRight,
  };
  const { line1: sampleAddr1, line2: sampleAddr2 } = splitAddress(sampleVals.headerSub);
  const { line1: sampleDealer1, line2: sampleDealer2 } = splitDealerName(sampleVals.headerText);

  const updateCurrentVal = (fieldKey, val) => {
    setCustomDefaults((prev) => ({ ...prev, [fieldKey]: val }));
    let col = mapping[fieldKey];
    if (!col) {
      col = fieldKey;
      setMapping((m) => ({ ...m, [fieldKey]: col }));
    }
    if (job?.rows?.length) {
      const idx = selectedRowIdx || 0;
      setJob((prev) => ({
        ...prev,
        rows: prev.rows.map((r, i) => {
          if (i === idx) return { ...r, [col]: val };
          if (fieldKey === 'footerRight' && (!r[col] || r[col] === customDefaults.footerRight)) {
            return { ...r, [col]: val };
          }
          return r;
        }),
      }));
    }
  };

  const onLeftLogoFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) {
      setTopLeftLogo(URL.createObjectURL(f));
    }
  };

  const onRightLogoFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) {
      setTopRightLogo(URL.createObjectURL(f));
    }
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
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              onClick={() => confirmDeleteSheet(job)}
              title={t('posters.deleteSheet')}
            >
              <Trash2 size={16} /> {t('posters.deleteSheet')}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => { setJob(null); setPosters([]); setMsg(''); }}>
              {t('posters.backSheets')}
            </button>
          </div>
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
                    <div key={s._id} className="poster-sheet-item">
                      <div className="poster-sheet-info" onClick={() => openJob(s)} role="button" tabIndex={0}>
                        <strong>{s.fileName}</strong>
                        <span>
                          {t('posters.dealersN').replace('{n}', String(s.rows?.length || 0))}
                          {' · '}
                          {t('posters.received')} {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                          {' · '}
                          {t(`posters.st.${s.status || 'pending'}`)}
                        </span>
                      </div>
                      <div className="poster-sheet-actions">
                        <button type="button" className="poster-sheet-open-btn" onClick={() => openJob(s)}>
                          {t('posters.openThis')}
                        </button>
                        <button
                          type="button"
                          className="poster-sheet-del-btn"
                          title={t('posters.deleteSheet')}
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteSheet(s);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
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
            <input ref={leftLogoInputRef} type="file" accept="image/*" hidden onChange={onLeftLogoFile} />
            <input ref={rightLogoInputRef} type="file" accept="image/*" hidden onChange={onRightLogoFile} />

            <div className="poster-stage-wrap">
              <div className="poster-ratio-bar">
                <div className="poster-ratio-btns">
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginRight: 4 }}>
                    {t('video.aspect') || 'Size'}:
                  </span>
                  <button
                    type="button"
                    className={`poster-ratio-btn ${aspectRatio === '4:5' ? 'active' : ''}`}
                    onClick={() => setAspectRatio('4:5')}
                    title="Official Swaraj Portrait Poster (1080x1350 / 4:5)"
                  >
                    📱 4:5 Portrait
                  </button>
                  <button
                    type="button"
                    className={`poster-ratio-btn ${aspectRatio === '1:1' ? 'active' : ''}`}
                    onClick={() => setAspectRatio('1:1')}
                    title="Square 1:1 (WhatsApp & Social Post)"
                  >
                    ⏹️ 1:1 Square
                  </button>
                  <button
                    type="button"
                    className={`poster-ratio-btn ${aspectRatio === 'original' ? 'active' : ''}`}
                    onClick={() => setAspectRatio('original')}
                    title="Keep Original Image Ratio"
                  >
                    🖼️ Original
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    className={`poster-ratio-btn ${showEditor ? 'active' : ''}`}
                    onClick={() => setShowEditor(!showEditor)}
                  >
                    ✏️ {showEditor ? 'Hide Edit Panel' : 'Edit Details & Logos'}
                  </button>
                  <label className="poster-badge-toggle">
                    <input
                      type="checkbox"
                      checked={showBrandBadges}
                      onChange={(e) => setShowBrandBadges(e.target.checked)}
                    />
                    <span>Show Badges</span>
                  </label>
                </div>
              </div>

              {showEditor && (
                <div className="poster-quick-editor">
                  <div className="poster-quick-tabs">
                    <button
                      type="button"
                      className={`poster-quick-tab ${activeTab === 'details' ? 'active' : ''}`}
                      onClick={() => setActiveTab('details')}
                    >
                      📝 Edit Details (Name, Address, Contact)
                    </button>
                    <button
                      type="button"
                      className={`poster-quick-tab ${activeTab === 'branding' ? 'active' : ''}`}
                      onClick={() => setActiveTab('branding')}
                    >
                      🎨 Change Logos & Colors
                    </button>
                  </div>

                  {activeTab === 'details' && (
                    <div className="poster-editor-grid">
                      {rows.length > 1 && (
                        <div className="form-group full-width">
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                            Select Dealer from Excel ({rows.length} dealers):
                          </label>
                          <select
                            value={selectedRowIdx}
                            onChange={(e) => setSelectedRowIdx(Number(e.target.value))}
                            style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          >
                            {rows.map((r, i) => (
                              <option key={i} value={i}>
                                Dealer {i + 1}: {cellFromRow(r, mapping.headerText) || `Row ${i + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Dealer / Firm Name
                        </label>
                        <input
                          type="text"
                          className="poster-edit-input"
                          value={sampleVals.headerText}
                          onChange={(e) => updateCurrentVal('headerText', e.target.value)}
                          placeholder="e.g. Shree Motors / मॉडल एजन्सीज"
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Address & Branches
                        </label>
                        <input
                          type="text"
                          className="poster-edit-input"
                          value={sampleVals.headerSub}
                          onChange={(e) => updateCurrentVal('headerSub', e.target.value)}
                          placeholder="e.g. MI Road, Jaipur, Rajasthan - 302001"
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Contact Number 1
                        </label>
                        <input
                          type="text"
                          className="poster-edit-input"
                          value={sampleVals.footerLeft}
                          onChange={(e) => updateCurrentVal('footerLeft', e.target.value)}
                          placeholder="e.g. +91 91161 23451"
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Contact 2 / Website
                        </label>
                        <input
                          type="text"
                          className="poster-edit-input"
                          value={sampleVals.footerRight}
                          onChange={(e) => updateCurrentVal('footerRight', e.target.value)}
                          placeholder="e.g. +91 77750 00051 or www.swarajtractors.com"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'branding' && (
                    <div className="poster-editor-grid">
                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Top-Left Logo:
                        </label>
                        <div className="poster-logo-picker-row">
                          <button
                            type="button"
                            className={`poster-pill-btn ${topLeftLogo === '/swaraj-gold-seal.svg' ? 'active' : ''}`}
                            onClick={() => setTopLeftLogo('/swaraj-gold-seal.svg')}
                          >
                            🌟 Gold Seal
                          </button>
                          <button
                            type="button"
                            className={`poster-pill-btn ${topLeftLogo === '/swaraj-logo.png' ? 'active' : ''}`}
                            onClick={() => setTopLeftLogo('/swaraj-logo.png')}
                          >
                            🏷️ Swaraj
                          </button>
                          <button
                            type="button"
                            className={`poster-pill-btn ${topLeftLogo && !['/swaraj-gold-seal.svg', '/swaraj-logo.png'].includes(topLeftLogo) ? 'active' : ''}`}
                            onClick={() => leftLogoInputRef.current?.click()}
                          >
                            📁 Upload Logo...
                          </button>
                          <button
                            type="button"
                            className={`poster-pill-btn ${!topLeftLogo ? 'active' : ''}`}
                            onClick={() => setTopLeftLogo(null)}
                          >
                            ❌ None
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Top-Right Logo:
                        </label>
                        <div className="poster-logo-picker-row">
                          <button
                            type="button"
                            className={`poster-pill-btn ${topRightLogo === '/swaraj-josh-badge.svg' ? 'active' : ''}`}
                            onClick={() => setTopRightLogo('/swaraj-josh-badge.svg')}
                          >
                            ⚡ Josh Ka Raaz
                          </button>
                          <button
                            type="button"
                            className={`poster-pill-btn ${topRightLogo === '/swaraj-logo.png' ? 'active' : ''}`}
                            onClick={() => setTopRightLogo('/swaraj-logo.png')}
                          >
                            🏷️ Swaraj
                          </button>
                          <button
                            type="button"
                            className={`poster-pill-btn ${topRightLogo && !['/swaraj-josh-badge.svg', '/swaraj-logo.png'].includes(topRightLogo) ? 'active' : ''}`}
                            onClick={() => rightLogoInputRef.current?.click()}
                          >
                            📁 Upload Logo...
                          </button>
                          <button
                            type="button"
                            className={`poster-pill-btn ${!topRightLogo ? 'active' : ''}`}
                            onClick={() => setTopRightLogo(null)}
                          >
                            ❌ None
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Footer Bar Color:
                        </label>
                        <div className="poster-color-swatches">
                          {['#BA0C2F', '#800020', '#003A70', '#18181B'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`poster-swatch ${footerBg === c ? 'active' : ''}`}
                              style={{ background: c }}
                              onClick={() => setFooterBg(c)}
                            />
                          ))}
                          <input
                            type="color"
                            value={footerBg}
                            onChange={(e) => setFooterBg(e.target.value)}
                            title="Custom Footer Color"
                            className="poster-color-picker-input"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Dealer Name Text Color:
                        </label>
                        <div className="poster-color-swatches">
                          {['#00843D', '#BA0C2F', '#C8963E', '#0F172A'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`poster-swatch ${dealerColor === c ? 'active' : ''}`}
                              style={{ background: c }}
                              onClick={() => setDealerColor(c)}
                            />
                          ))}
                          <input
                            type="color"
                            value={dealerColor}
                            onChange={(e) => setDealerColor(e.target.value)}
                            title="Custom Dealer Name Color"
                            className="poster-color-picker-input"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="poster-preview-stage">
                <div className={`poster-live aspect-${aspectRatio === '4:5' ? 'portrait' : aspectRatio === '1:1' ? 'square' : 'original'}`}>
                  {templateSrc ? (
                    <img className="poster-bg-img" src={templateSrc} alt="Poster Template" />
                  ) : (
                    <div className="empty-state" style={{ minHeight: 220 }}>{t('posters.needTpl')}</div>
                  )}

                  {templateSrc && (
                    <>
                      {showBrandBadges && (
                        <>
                          {topLeftLogo && (
                            <div
                              className="poster-top-seal-badge interactive"
                              title="Click to replace top-left logo"
                              onClick={() => leftLogoInputRef.current?.click()}
                            >
                              <img src={topLeftLogo} alt="Top-Left Logo" />
                              <span className="poster-badge-hover-hint">Change Logo</span>
                            </div>
                          )}
                          {topRightLogo && (
                            <div
                              className="poster-top-josh-badge interactive"
                              title="Click to replace top-right logo"
                              onClick={() => rightLogoInputRef.current?.click()}
                            >
                              <img src={topRightLogo} alt="Top-Right Logo" />
                              <span className="poster-badge-hover-hint">Change Logo</span>
                            </div>
                          )}
                        </>
                      )}

                      <div
                        className="poster-live-footer-strip"
                        style={{ background: footerBg }}
                      >
                        <div
                          className="poster-strip-badge"
                          style={{ background: dealerBg }}
                          title="Click to edit dealer name"
                          onClick={() => { setShowEditor(true); setActiveTab('details'); }}
                        >
                          <div className="poster-strip-dealer-box" style={{ color: dealerColor }}>
                            <span className="dealer-l1">{sampleDealer1}</span>
                            {sampleDealer2 && <span className="dealer-l2">{sampleDealer2}</span>}
                          </div>
                        </div>
                        <div
                          className="poster-strip-center"
                          title="Click to edit address"
                          onClick={() => { setShowEditor(true); setActiveTab('details'); }}
                        >
                          <span className="poster-strip-circle-icon">
                            <svg viewBox="0 0 24 24" style={{ fill: footerBg }}>
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                            </svg>
                          </span>
                          <div className="poster-strip-text">
                            <strong className="addr-line1">{sampleAddr1}</strong>
                            {sampleAddr2 && <span className="addr-line2">{sampleAddr2}</span>}
                          </div>
                        </div>
                        <div className="poster-strip-divider" />
                        <div
                          className="poster-strip-right"
                          title="Click to edit contact numbers"
                          onClick={() => { setShowEditor(true); setActiveTab('details'); }}
                        >
                          <span className="poster-strip-circle-icon">
                            <svg viewBox="0 0 24 24" style={{ fill: footerBg }}>
                              <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z"/>
                            </svg>
                          </span>
                          <div className="poster-strip-text">
                            <strong className="phone-line1">{sampleVals.footerLeft}</strong>
                            {sampleVals.footerRight && (
                              <strong className="phone-line2">
                                {String(sampleVals.footerRight).replace(/^https?:\/\//i, '')}
                              </strong>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="poster-work-side">
              <label className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                {t('posters.changePic')}
                <input type="file" accept="image/*" hidden onChange={onPicture} />
              </label>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setPicture('/default-poster-template.jpg')}
              >
                🌾 Festive Template
              </button>
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
              {!!posters.length && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#00843D',
                    borderColor: '#00843D',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.65rem',
                    boxShadow: '0 4px 12px rgba(0, 132, 61, 0.25)',
                    cursor: downloadingZip ? 'wait' : 'pointer',
                  }}
                  disabled={downloadingZip || busy}
                  onClick={downloadAllZip}
                >
                  {downloadingZip ? `⏳ ${zipProgress || 'Preparing ZIP...'}` : `📦 Download All (${posters.length} ZIP)`}
                </button>
              )}
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
                        const col = mapping[f.key] || f.key;
                        const cellVal = (r[col] != null && String(r[col]).trim() !== '')
                          ? String(r[col])
                          : (f.key === 'footerRight' ? (customDefaults.footerRight || 'www.swarajtractors.com') : '');
                        return (
                          <td key={f.key}>
                            <input
                              className="poster-cell"
                              value={cellVal}
                              onChange={(e) => {
                                if (!mapping[f.key]) {
                                  setMapping((m) => ({ ...m, [f.key]: col }));
                                }
                                setCell(i, col, e.target.value);
                              }}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  {t('posters.mine')} ({posters.length})
                </h3>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#00843D',
                    borderColor: '#00843D',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.92rem',
                    borderRadius: 6,
                    boxShadow: '0 4px 12px rgba(0, 132, 61, 0.25)',
                    cursor: downloadingZip ? 'wait' : 'pointer',
                  }}
                  onClick={downloadAllZip}
                  disabled={downloadingZip || busy}
                >
                  {downloadingZip ? (
                    <>⏳ {zipProgress || 'Preparing ZIP...'}</>
                  ) : (
                    <>📦 Download All ({posters.length} Posters ZIP)</>
                  )}
                </button>
              </div>
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

      <PosterLightbox posters={posters} index={preview} onIndex={setPreview} onClose={() => setPreview(null)}>
        <button
          type="button"
          className="btn btn-sm poster-lb-btn"
          style={{ background: '#00843D', color: '#ffffff', border: 'none', fontWeight: 600 }}
          disabled={downloadingZip}
          onClick={downloadAllZip}
        >
          {downloadingZip ? `⏳ ${zipProgress || 'Zipping...'}` : `📦 Download All (${posters.length} ZIP)`}
        </button>
      </PosterLightbox>
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
      <ConfirmDialog open={!!ask} title={ask?.title} message={ask?.message} danger={ask?.danger} busy={busy} onClose={() => !busy && setAsk(null)} onConfirm={() => ask?.run?.()} />
    </div>
  );
};

export default BulkPosters;
