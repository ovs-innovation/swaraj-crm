import { useEffect, useState } from 'react';
import { studioAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';
import { mediaUrl } from '../utils/mediaUrl';

const kinds = ['video', 'image', 'logo', 'intro', 'outro', 'music', 'font'];

const MediaLibrary = () => {
  const { t } = useLang();
  const [kind, setKind] = useState('');
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [fileKind, setFileKind] = useState('logo');
  const [file, setFile] = useState(null);

  const load = () => studioAPI.library(kind ? { kind } : {}).then((res) => setRows(res.data.data || []));
  useEffect(() => { load(); }, [kind]);

  const add = async (e) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', fileKind);
    fd.append('name', name || file.name);
    await studioAPI.addAsset(fd);
    setFile(null);
    setName('');
    load();
  };

  return (
    <div>
      <div className="page-header"><h1>{t('video.library')}</h1></div>
      <form className="card" onSubmit={add} style={{ maxWidth: 640, marginBottom: 16 }}>
        <div className="form-row">
          <div className="form-group"><label>{t('name')}</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="form-group">
            <label>{t('video.kind')}</label>
            <select value={fileKind} onChange={(e) => setFileKind(e.target.value)}>{kinds.map((k) => <option key={k}>{k}</option>)}</select>
          </div>
        </div>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0])} required />
        <button className="btn btn-primary" style={{ marginTop: 12 }}>{t('create')}</button>
      </form>
      <div className="lang-switch" style={{ marginBottom: 12 }}>
        <button type="button" className={!kind ? 'on' : ''} onClick={() => setKind('')}>{t('all')}</button>
        {kinds.map((k) => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      <div className="lib-grid">
        {rows.map((r) => (
          <div className="card" key={r._id}>
            <strong>{r.name}</strong>
            <small>{r.kind}</small>
            {/\.(png|jpe?g|webp|gif)$/i.test(r.url) ? <img src={mediaUrl(r.url)} alt="" style={{ width: '100%', marginTop: 8 }} /> : <a href={mediaUrl(r.url)} target="_blank" rel="noreferrer">Open</a>}
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => studioAPI.deleteAsset(r._id).then(load)}>{t('delete')}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaLibrary;
