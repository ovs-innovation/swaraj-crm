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
  Frame,
  Images,
  BookOpen,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import BrandLogo from './BrandLogo';
import LangSwitch from './LangSwitch';
import './Layout.css';

const Layout = () => {
  const { user, logout, isSuperAdmin, isAreaManager, isHqAdmin } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/admin/area-managers', icon: Users, label: t('nav.areaManagers') },
    { to: '/admin/dealers', icon: Store, label: t('nav.dealers') },
    { to: '/admin/visits', icon: MapPin, label: t('nav.visits') },
    { to: '/admin/media', icon: Image, label: t('nav.media') },
    { to: '/admin/posters', icon: Images, label: t('nav.posters') },
    { to: '/admin/reports', icon: FileText, label: t('nav.reports') },
    { to: '/admin/audit-logs', icon: Shield, label: t('nav.audit') },
    { to: '/admin/settings', icon: Settings, label: t('nav.settings') },
  ];

  const superAdminLinks = [
    { to: '/super-admin', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/super-admin/letterhead', icon: Frame, label: t('nav.letterhead') },
    { to: '/super-admin/posters', icon: Images, label: t('nav.posters') },
    { to: '/admin/users', icon: Crown, label: t('nav.hqUsers') },
    ...adminLinks.slice(1).filter((l) => l.to !== '/admin/posters'),
  ];

  const areaManagerLinks = [
    { to: '/area-manager', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/area-manager/dealers', icon: Store, label: t('nav.myDealers') },
    { to: '/area-manager/visits', icon: MapPin, label: t('nav.visits') },
    { to: '/area-manager/media', icon: Image, label: t('nav.approve') },
    { to: '/area-manager/sheet', icon: FileText, label: t('nav.sendSheet') },
    { to: '/area-manager/reports', icon: ClipboardList, label: t('nav.reports') },
  ];

  const dealerLinks = [
    { to: '/dealer', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/dealer/profile', icon: User, label: t('nav.profile') },
    { to: '/dealer/upload', icon: Upload, label: t('nav.upload') },
    { to: '/dealer/posts', icon: Image, label: t('nav.posts') },
    { to: '/dealer/visits', icon: MapPin, label: t('nav.visitHistory') },
  ];

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
      <header className="app-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={22} />
        </button>
        <BrandLogo size={36} light />
        <div className="header-meta">
          <a className="header-logout" href="/Swaraj-CRM-User-Guide.html" target="_blank" rel="noreferrer" download="Swaraj-CRM-User-Guide.html">
            <BookOpen size={16} />
            {t('nav.guide')}
          </a>
          <LangSwitch light />
          <span className="topbar-role">{t(`roles.${user?.role}`)}</span>
          <div className="header-user">
            <span>{user?.name}</span>
            <button className="header-logout" onClick={handleLogout} type="button">
              <LogOut size={16} />
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="layout-body">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <p className="nav-label">{t('navigation')}</p>
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
        </aside>

        <div className="main-content">
          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

export default Layout;
