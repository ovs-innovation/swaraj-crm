import { useEffect } from 'react';
import { X } from 'lucide-react';
import { mediaUrl } from '../../utils/mediaUrl';
import { useLang } from '../context/LanguageContext';

const PosterLightbox = ({ posters, index, onIndex, onClose, children }) => {
  const { t } = useLang();
  const poster = posters[index];

  useEffect(() => {
    if (poster == null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < posters.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [poster, index, posters.length, onClose, onIndex]);

  if (!poster) return null;

  return (
    <div
      className="modal-overlay"
      style={{ background: 'rgba(10, 12, 16, 0.92)', zIndex: 1200, padding: '1.25rem' }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('posters.closePreview')}
        title={t('posters.closePreview')}
        style={{
          position: 'fixed',
          top: 18,
          right: 18,
          zIndex: 1210,
          width: 48,
          height: 48,
          border: 'none',
          borderRadius: '50%',
          background: '#ffffff',
          color: '#111827',
          boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={28} strokeWidth={2.75} />
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(1100px, 100%)', maxHeight: '96vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: '#fff', alignItems: 'center', paddingRight: 56 }}>
          <div>
            <strong>{poster.dealerName}</strong>
            <span style={{ opacity: 0.75, marginLeft: 8, fontSize: '0.85rem' }}>
              {index + 1} / {posters.length}
            </span>
          </div>
        </div>
        <img
          src={mediaUrl(poster.url)}
          alt={poster.dealerName}
          style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', background: '#111', display: 'block', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="btn btn-sm poster-lb-btn" disabled={index <= 0} onClick={() => onIndex(index - 1)}>
            {t('posters.prev')}
          </button>
          <button type="button" className="btn btn-sm poster-lb-btn" disabled={index >= posters.length - 1} onClick={() => onIndex(index + 1)}>
            {t('posters.next')}
          </button>
          <a className="btn btn-sm poster-lb-btn" href={mediaUrl(poster.url)} download={`${poster.dealerName || 'poster'}-8k.png`}>
            {t('posters.dl8k')}
          </a>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PosterLightbox;
