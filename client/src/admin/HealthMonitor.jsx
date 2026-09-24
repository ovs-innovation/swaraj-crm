import { useEffect, useState } from 'react';
import { studioAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';

const Row = ({ name, item }) => (
  <div className={`health-row ${item?.ok ? 'ok' : 'bad'}`}>
    <strong>{name}</strong>
    <span>{item?.ok ? 'OK' : 'Check'}</span>
    <small>{item?.detail}</small>
  </div>
);

const HealthMonitor = () => {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const load = () => studioAPI.health().then((res) => setData(res.data.data)).catch(() => setData(null));
  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <div className="loading">{t('loading')}</div>;

  return (
    <div>
      <div className="page-header"><h1>{t('nav.health')}</h1></div>
      <div className="card">
        <Row name="FFmpeg" item={data.ffmpeg} />
        <Row name="FFprobe" item={data.ffprobe} />
        <Row name="Redis" item={data.redis} />
        <Row name="Queue" item={data.queue} />
        <Row name="Cloudinary / S3" item={data.storage} />
        <Row name="Meta API" item={data.meta} />
        <Row name="Meta token" item={data.token} />
        <Row
          name="Publish"
          item={{
            ok: data.token?.publishEnabled,
            detail: data.token?.publishEnabled ? 'Enabled' : 'Disabled until token is updated',
          }}
        />
        <Row name="Storage" item={data.disk} />
        <Row name="CPU" item={data.cpu} />
        <Row name="RAM" item={data.ram} />
      </div>
    </div>
  );
};

export default HealthMonitor;
