import { useEffect, useState } from 'react';
import { settingsAPI } from '../services/api';

const Settings = () => {
  const [form, setForm] = useState({
    companyName: '', companyEmail: '', companyPhone: '', companyAddress: '',
    theme: { primaryColor: '#E31837', secondaryColor: '#1a1a2e' },
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsAPI.get().then((res) => setForm(res.data.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await settingsAPI.update(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="page-header"><h1>Settings</h1></div>
      {saved && <div className="alert alert-success">Settings saved successfully</div>}
      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Company Name</label><input value={form.companyName || ''} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
          <div className="form-group"><label>Company Email</label><input type="email" value={form.companyEmail || ''} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} /></div>
          <div className="form-group"><label>Company Phone</label><input value={form.companyPhone || ''} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })} /></div>
          <div className="form-group"><label>Company Address</label><textarea rows={2} value={form.companyAddress || ''} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label>Primary Color</label><input type="color" value={form.theme?.primaryColor || '#E31837'} onChange={(e) => setForm({ ...form, theme: { ...form.theme, primaryColor: e.target.value } })} /></div>
            <div className="form-group"><label>Secondary Color</label><input type="color" value={form.theme?.secondaryColor || '#1a1a2e'} onChange={(e) => setForm({ ...form, theme: { ...form.theme, secondaryColor: e.target.value } })} /></div>
          </div>
          <button type="submit" className="btn btn-primary">Save Settings</button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
