import { useEffect, useState } from 'react';
import { reportAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { BrandBarChart } from '../components/ChartKit';

const Reports = () => {
  const { isAdmin } = useAuth();
  const { t } = useLang();
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
    if (fetcher) fetcher().then((res) => setData(res.data.data || [])).finally(() => setLoading(false));
  }, [tab]);

  const tabs = isAdmin
    ? ['dealers', 'visits', 'uploads', 'state-wise', 'area-wise']
    : ['visits', 'uploads'];

  const tabLabel = (tabKey) =>
    tabKey === 'dealers' ? t('reports.dealers')
      : tabKey === 'visits' ? t('reports.visits')
        : tabKey === 'uploads' ? t('reports.uploads')
          : tabKey === 'state-wise' ? t('reports.stateWise')
            : t('reports.areaWise');

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

  const chartData = tab === 'state-wise'
    ? data.map((d) => ({ name: d._id || '—', count: d.total }))
    : tab === 'area-wise'
      ? data.map((d) => ({ name: d.name || d.employeeId || '—', count: d.totalDealers }))
      : [];

  const columns = data[0]
    ? Object.keys(data[0]).filter((k) => !['_id', '__v'].includes(k) && typeof data[0][k] !== 'object')
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('reports.title')}</h1>
        </div>
        <button className="btn btn-outline" onClick={exportCSV}>{t('reports.export')}</button>
      </div>

      <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabs.map((tabKey) => (
          <button key={tabKey} className={`btn btn-sm ${tab === tabKey ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(tabKey)}>
            {tabLabel(tabKey)}
          </button>
        ))}
      </div>

      {!!chartData.length && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">{tabLabel(tab)}</h3>
          <BrandBarChart data={chartData} horizontal={chartData.length > 5} height={Math.max(280, chartData.length * 34)} />
        </div>
      )}

      <div className="card">
        {loading ? <div className="loading">{t('loading')}</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {columns.map((k) => (
                    <th key={k}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row._id || i}>
                    {columns.map((k) => (
                      <td key={k}>{String(row[k] ?? '—')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.length && <p className="empty-state">{t('noData')}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
