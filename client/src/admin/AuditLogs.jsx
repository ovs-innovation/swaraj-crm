import { useEffect, useState } from 'react';
import { reportAPI } from '../services/api';
import { useLang } from '../shared/context/LanguageContext';

const AuditLogs = () => {
  const { t } = useLang();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportAPI.getAuditLogs().then((res) => setLogs(res.data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header"><h1>{t('audit.title')}</h1></div>
      <div className="card">
        {loading ? <div className="loading">{t('loading')}</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>{t('audit.user')}</th><th>{t('audit.action')}</th><th>{t('audit.entity')}</th><th>{t('date')}</th></tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id}>
                    <td>{l.user?.name || 'System'}<br /><small>{l.user?.email}</small></td>
                    <td><span className="badge badge-pending">{l.action}</span></td>
                    <td>{l.entity || '—'}</td>
                    <td>{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!logs.length && <p className="empty-state">{t('audit.none')}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
