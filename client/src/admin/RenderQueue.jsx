import { useEffect, useState } from 'react';
import { studioAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';

const Col = ({ title, rows, tone }) => (
  <div className="card">
    <h3>{title} <small>({rows.length})</small></h3>
    {!rows.length ? <p className="empty-state">—</p> : rows.map((r) => (
      <div key={r._id} className={`rq-item ${tone}`}>
        <strong>{r.dealer?.dealerName || 'Video'}</strong>
        <span>{r.status} · ETA {r.etaLabel}</span>
        {typeof r.renderProgress === 'number' && r.status === 'rendering' && (
          <div className="video-bar"><i style={{ width: `${r.renderProgress}%` }} /></div>
        )}
        {r.errorMessage && <em>{r.errorMessage}</em>}
      </div>
    ))}
  </div>
);

const RenderQueue = () => {
  const { t } = useLang();
  const [data, setData] = useState({ waiting: [], rendering: [], completed: [], failed: [], engine: 'local' });

  const load = () => studioAPI.queue().then((res) => setData(res.data.data)).catch(() => {});
  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('video.queueDash')}</h1>
          <p>Engine: {data.engine === 'bullmq' ? 'BullMQ + Redis' : 'Local FFmpeg worker'}</p>
        </div>
      </div>
      <div className="rq-grid">
        <Col title={t('video.wait')} rows={data.waiting} tone="wait" />
        <Col title={t('video.rendering')} rows={data.rendering} tone="run" />
        <Col title={t('video.done')} rows={data.completed} tone="ok" />
        <Col title={t('video.failQ')} rows={data.failed} tone="bad" />
      </div>
    </div>
  );
};

export default RenderQueue;
