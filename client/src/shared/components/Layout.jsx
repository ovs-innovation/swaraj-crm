import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  MapPin,
  Image,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Shield,
  User,
  Upload,
  Crown,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/area-managers', icon: Users, label: 'Area Managers' },
  { to: '/admin/dealers', icon: Store, label: 'Dealers' },
  { to: '/admin/visits', icon: MapPin, label: 'Visits' },
  { to: '/admin/media', icon: Image, label: 'Posts & Media' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/audit-logs', icon: Shield, label: 'Audit Logs' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const superAdminLinks = [
  { to: '/super-admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Crown, label: 'HQ Users' },
  { to: '/admin/area-managers', icon: Users, label: 'Area Managers' },
  { to: '/admin/dealers', icon: Store, label: 'Dealers' },
  { to: '/admin/visits', icon: MapPin, label: 'Visits' },
  { to: '/admin/media', icon: Image, label: 'Posts & Media' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/audit-logs', icon: Shield, label: 'Audit Logs' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const areaManagerLinks = [
  { to: '/area-manager', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/area-manager/dealers', icon: Store, label: 'My Dealers' },
  { to: '/area-manager/visits', icon: MapPin, label: 'Visits' },
  { to: '/area-manager/media', icon: Image, label: 'Approve Uploads' },
  { to: '/area-manager/reports', icon: ClipboardList, label: 'Reports' },
];

const dealerLinks = [
  { to: '/dealer', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dealer/profile', icon: User, label: 'My Profile' },
  { to: '/dealer/upload', icon: Upload, label: 'Upload Video' },
  { to: '/dealer/posts', icon: Image, label: 'Approved Posts' },
  { to: '/dealer/visits', icon: MapPin, label: 'Visit History' },
];

const roleLabels = {
  super_admin: 'Super Admin',
  admin: 'Head Office',
  area_manager: 'Area Manager',
  dealer: 'Dealer',
};

const Layout = () => {
  const { user, logout, isSuperAdmin, isAreaManager, isHqAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const links = isSuperAdmin
    ? superAdminLinks
    : isHqAdmin
      ? adminLinks
      : isAreaManager
        ? areaManagerLinks
        : dealerLinks;
  const homePath = isSuperAdmin ? '/super-admin' : isHqAdmin ? '/admin' : isAreaManager ? '/area-manager' : '/dealer';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">V</span>
            <div>
              <strong>Vastora CRM</strong>
              <small>{roleLabels[user?.role] || 'User'}</small>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === homePath} onClick={() => setSidebarOpen(false)}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0)}</div>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-title">
            <h2>Vastora Dealer CRM</h2>
            <span className="topbar-role">{roleLabels[user?.role]}</span>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

export default Layout;
