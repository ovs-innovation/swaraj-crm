import { useRef } from 'react';
import { useLang } from '../context/LanguageContext';

const ConfirmDialog = ({ open, title, message, confirmLabel, cancelLabel, danger, busy, onConfirm, onClose }) => {
  const { t } = useLang();
  const lock = useRef(false);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose} style={{ zIndex: 1300 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h2>{title || t('confirmTitle')}</h2>
        <p style={{ color: 'var(--text-muted, #57534e)', lineHeight: 1.5, marginBottom: '1.25rem' }}>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>
            {cancelLabel || t('cancel')}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={busy}
            onClick={() => {
              if (lock.current || busy) return;
              lock.current = true;
              Promise.resolve(onConfirm()).finally(() => {
                lock.current = false;
              });
            }}
          >
            {busy ? t('loading') : confirmLabel || t('confirmYes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
