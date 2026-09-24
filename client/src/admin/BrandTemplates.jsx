import { useEffect, useState } from 'react';
import { studioAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';

const pick = (rows, kind) => rows.filter((r) => r.kind === kind);

const BrandTemplates = () => {
  const { t } = useLang();
  const [assets, setAssets] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: 'Vastora Tech', logo: '', intro: '', outro: '', watermark: '', music: '' });

  const load = async () => {
    const [a, tpls] = await Promise.all([studioAPI.library(), studioAPI.templates()]);
    setAssets(a.data.data || []);
    setRows(tpls.data.data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await studioAPI.saveTemplate(form);
    setForm({ name: '', logo: '', intro: '', outro: '', watermark: '', music: '' });
    load();
  };

  const sel = (label, kind, key) => (
    <div className="form-group">
      <label>{label}</label>
      <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
        <option value="">—</option>
        {pick(assets, kind).map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <div className="page-header"><h1>{t('video.templates')}</h1></div>
      <form className="card" onSubmit={save} style={{ maxWidth: 640, marginBottom: 16 }}>
        <div className="form-group"><label>{t('name')}</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        {sel('Logo', 'logo', 'logo')}
        {sel('Watermark', 'logo', 'watermark')}
        {sel('Intro', 'intro', 'intro')}
        {sel('Outro', 'outro', 'outro')}
        {sel('Music', 'music', 'music')}
        <button className="btn btn-primary">{t('save')}</button>
      </form>
      {rows.map((r) => (
        <div className="card" key={r._id} style={{ marginBottom: 8 }}>
          <strong>{r.name}</strong>
          <p>{['logo', 'intro', 'outro', 'watermark', 'music'].map((k) => r[k]?.name).filter(Boolean).join(' · ') || '—'}</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => studioAPI.deleteTemplate(r._id).then(load)}>{t('delete')}</button>
        </div>
      ))}
    </div>
  );
};

export default BrandTemplates;
