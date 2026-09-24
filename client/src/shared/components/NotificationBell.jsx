import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { studioAPI } from '../../services/api';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = () => {
    studioAPI.notifications().then((res) => {
      setRows(res.data.data || []);
      setUnread(res.data.unread || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const openOne = async (n) => {
    await studioAPI.readNotifications([n._id]);
    setOpen(false);
    if (n.link) navigate(n.link);
    load();
  };

  return (
    <div className="notify-wrap">
      <button type="button" className="header-logout" onClick={() => setOpen((v) => !v)}>
        <Bell size={16} />
        {unread > 0 && <em className="notify-dot">{unread > 9 ? '9+' : unread}</em>}
      </button>
      {open && (
        <div className="notify-panel">
          <div className="notify-head">
            <strong>Notifications</strong>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => studioAPI.readNotifications().then(load)}>Mark all</button>
          </div>
          {!rows.length ? <p className="empty-state">No notifications</p> : rows.slice(0, 12).map((n) => (
            <button key={n._id} type="button" className={`notify-item ${n.read ? '' : 'unread'}`} onClick={() => openOne(n)}>
              <b>{n.title}</b>
              <span>{n.body}</span>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
