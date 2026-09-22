import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { postersAPI } from '../../services/api';
import { useLang } from '../context/LanguageContext';
import { mediaUrl } from '../../utils/mediaUrl';
import { composeOverlayBlob } from '../../utils/composePoster';
import '../../admin/LetterheadEditor.css';

const FONTS = [
  { group: 'English', items: [
    { id: 'Inter', label: 'Inter' }, { id: 'Poppins', label: 'Poppins' }, { id: 'Montserrat', label: 'Montserrat' },
    { id: 'Roboto', label: 'Roboto' }, { id: 'Oswald', label: 'Oswald' }, { id: 'Georgia', label: 'Georgia' },
  ]},
  { group: 'हिंदी', items: [
    { id: 'Noto Sans Devanagari', label: 'Noto Sans हिंदी' }, { id: 'Hind', label: 'Hind' }, { id: 'Mukta', label: 'Mukta' },
  ]},
];
const COLORS = ['#ffffff', '#111111', '#e8f4fc', '#0078D4', '#1B365D', '#4aa3e8'];
const KEYS = ['headerText', 'headerSub', 'footerLeft', 'footerRight'];

const baseLine = (value, extra) => ({
  value: value || '',
  x: 4, y: 4, w: 70, size: 22, font: 'Inter', bold: true, italic: false, align: 'left', color: '#ffffff',
  ...extra,
});

const fromPoster = (poster) => {
  const saved = poster.layout?.texts;
  if (saved?.headerText) return saved;
  return {
    headerText: baseLine(poster.dealerName, { y: 4, size: 24, bold: true }),
    headerSub: baseLine('', { y: 11, size: 14, bold: false, w: 78 }),
    footerLeft: baseLine('', { y: 88, size: 13, bold: false, w: 42 }),
    footerRight: baseLine('', { y: 88, x: 52, w: 44, size: 13, bold: false, align: 'right' }),
  };
};

const PosterEditModal = ({ poster, onClose, onSaved }) => {
  const { t } = useLang();
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const [texts, setTexts] = useState(() => fromPoster(poster));
  const [focus, setFocus] = useState('headerText');
  const [picture, setPicture] = useState(mediaUrl(poster.url));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = texts[focus] || texts.headerText;

  useEffect(() => {
    setTexts(fromPoster(poster));
    setPicture(mediaUrl(poster.url));
  }, [poster]);

  const patch = (key, extra) => setTexts((cur) => ({ ...cur, [key]: { ...cur[key], ...extra } }));

  const onPic = (e) => {
    const file = e.target.files?.[0];
    if (file) setPicture(URL.createObjectURL(file));
  };

  const startMove = (key) => (e) => {
    if (e.target.tagName === 'INPUT' || e.target.classList.contains('lh-resize')) return;
    e.preventDefault();
    setFocus(key);
    const box = canvasRef.current.getBoundingClientRect();
    const pos = texts[key];
    drag.current = { type: 'move', key, dx: ((e.clientX - box.left) / box.width) * 100 - pos.x, dy: ((e.clientY - box.top) / box.height) * 100 - pos.y };
    const move = (ev) => {
      const r = canvasRef.current.getBoundingClientRect();
      patch(drag.current.key, {
        x: Math.min(88, Math.max(0, ((ev.clientX - r.left) / r.width) * 100 - drag.current.dx)),
        y: Math.min(94, Math.max(0, ((ev.clientY - r.top) / r.height) * 100 - drag.current.dy)),
      });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const startBoxResize = (key) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFocus(key);
    const item = texts[key];
    drag.current = { type: 'box', key, startX: e.clientX, startY: e.clientY, w: item.w, size: item.size };
    const move = (ev) => {
      if (drag.current?.type !== 'box') return;
      patch(drag.current.key, {
        w: Math.min(90, Math.max(12, drag.current.w + (ev.clientX - drag.current.startX) / 6)),
        size: Math.min(72, Math.max(10, Math.round(drag.current.size + (ev.clientY - drag.current.startY) / 4))),
      });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const blob = await composeOverlayBlob(picture, texts);
      const fd = new FormData();
      fd.append('dealerName', texts.headerText.value || poster.dealerName || 'Dealer');
      fd.append('layout', JSON.stringify({ texts }));
      fd.append('file', blob, `${poster.dealerName || 'poster'}-edit.jpg`);
      await postersAPI.update(poster._id, fd);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('posters.fail'));
    } finally {
      setBusy(false);
    }
  };

  const labels = {
    headerText: t('name'),
    headerSub: t('lh.headerSub'),
    footerLeft: t('lh.footerL'),
    footerRight: t('lh.footerR'),
  };

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal" style={{ maxWidth: 1080, padding: '1.1rem' }} onClick={(e) => e.stopPropagation()}>
        <h2>{t('edit')} · {poster.dealerName}</h2>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>{t('posters.editHint')}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="lh-toolbar">
          <select className="lh-font" value={active.font} onChange={(e) => patch(focus, { font: e.target.value })}>
            {FONTS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </optgroup>
            ))}
          </select>
          <label>
            {t('lh.size')}
            <input type="number" min="10" max="72" value={active.size} onChange={(e) => patch(focus, { size: Number(e.target.value) })} />
          </label>
          <button type="button" className={active.bold ? 'on' : ''} onClick={() => patch(focus, { bold: !active.bold })}><Bold size={15} /></button>
          <button type="button" className={active.italic ? 'on' : ''} onClick={() => patch(focus, { italic: !active.italic })}><Italic size={15} /></button>
          <button type="button" className={active.align === 'left' ? 'on' : ''} onClick={() => patch(focus, { align: 'left' })}><AlignLeft size={15} /></button>
          <button type="button" className={active.align === 'center' ? 'on' : ''} onClick={() => patch(focus, { align: 'center' })}><AlignCenter size={15} /></button>
          <button type="button" className={active.align === 'right' ? 'on' : ''} onClick={() => patch(focus, { align: 'right' })}><AlignRight size={15} /></button>
          <div className="lh-swatch">
            {COLORS.map((c) => (
              <button key={c} type="button" className={active.color?.toLowerCase() === c ? 'on' : ''} style={{ background: c }} onClick={() => patch(focus, { color: c })} />
            ))}
            <input type="color" value={active.color?.startsWith('#') ? active.color : '#ffffff'} onChange={(e) => patch(focus, { color: e.target.value })} />
          </div>
        </div>
        <div className="lh-grid">
          <div className="lh-stage card" style={{ margin: 0 }}>
            <div className="lh-canvas" ref={canvasRef}>
              <img src={picture} alt="" />
              {KEYS.map((key) => {
                const item = texts[key];
                return (
                  <div
                    key={key}
                    className={`lh-float ${focus === key ? 'sel' : ''}`}
                    style={{
                      left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`,
                      color: item.color, fontFamily: `'${item.font}', 'Noto Sans Devanagari', sans-serif`,
                      fontWeight: item.bold ? 700 : 400, fontStyle: item.italic ? 'italic' : 'normal',
                    }}
                    onMouseDown={startMove(key)}
                    onClick={() => setFocus(key)}
                  >
                    <span className="lh-grip" />
                    <input className="lh-line" style={{ fontSize: item.size, textAlign: item.align, color: item.color }} value={item.value} onChange={(e) => patch(key, { value: e.target.value })} />
                    {focus === key && <button type="button" className="lh-resize" onMouseDown={startBoxResize(key)} />}
                  </div>
                );
              })}
              <label className="lh-replace">
                <input type="file" accept="image/*" onChange={onPic} hidden />
                {t('posters.replacePic')}
              </label>
            </div>
          </div>
          <aside className="lh-side card" style={{ margin: 0 }}>
            {KEYS.map((key) => (
              <div className="form-group" key={key}>
                <label>{labels[key]}</label>
                <input value={texts[key].value} onFocus={() => setFocus(key)} onChange={(e) => patch(key, { value: e.target.value })} />
              </div>
            ))}
          </aside>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{busy ? t('loading') : t('save')}</button>
        </div>
      </div>
    </div>
  );
};

export default PosterEditModal;
