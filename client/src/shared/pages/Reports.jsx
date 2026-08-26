import { useEffect, useState } from 'react';
import { reportAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('dealers');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchers = {
      dealers: reportAPI.getDealers,
      visits: reportAPI.getVisits,
      uploads: reportAPI.getUploads,
      'state-wise': reportAPI.getStateWise,
      'area-wise': reportAPI.getAreaWise,
    };
    const fetcher = fetchers[tab];
    if (fetcher) fetcher().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, [tab]);

  const tabs = isAdmin
    ? ['dealers', 'visits', 'uploads', 'state-wise', 'area-wise']
    : ['visits', 'uploads'];

  const exportCSV = () => {
    if (!data.length) return;
    const keys = Object.keys(data[0]).filter((k) => !k.startsWith('_'));
    const csv = [keys.join(','), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab}-report.csv`;
    a.click();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <button className="btn btn-outline" onClick={exportCSV}>Export CSV</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {data[0] && Object.keys(data[0]).filter((k) => !['_id', '__v'].includes(k) && typeof data[0][k] !== 'object').map((k) => (
                    <th key={k}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row._id || i}>
                    {Object.entries(row).filter(([k, v]) => !['_id', '__v'].includes(k) && typeof v !== 'object').map(([k, v]) => (
                      <td key={k}>{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.length && <p className="empty-state">No data available</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
