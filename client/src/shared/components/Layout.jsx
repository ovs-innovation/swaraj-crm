import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { portalLoginPath } from '../../portal';
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
  Images,
  BookOpen,
  Share2,
  Clapperboard,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import BrandLogo from './BrandLogo';
import LangSwitch from './LangSwitch';
import NotificationBell from './NotificationBell';
import './Layout.css';

const Layout = () => {
  const { user, logout, isSuperAdmin, isAreaManager, isHqAdmin } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const L = (to, icon, label) => ({ to, icon, label });

  const groups = isSuperAdmin
    ? [
        { title: t('nav.gWork'), items: [L('/super-admin', LayoutDashboard, t('nav.dashboard')), L('/super-admin/posters', Images, t('nav.posters')), L('/super-admin/videos', Clapperboard, t('nav.videos')), L('/super-admin/social', Share2, t('nav.social'))] },
        { title: t('nav.gPeople'), items: [L('/admin/users', Crown, t('nav.hqUsers')), L('/admin/area-managers', Users, t('nav.areaManagers')), L('/admin/dealers', Store, t('nav.dealers'))] },
        { title: t('nav.gMore'), items: [L('/admin/visits', MapPin, t('nav.visits')), L('/admin/media', Image, t('nav.media')), L('/admin/reports', FileText, t('nav.reports')), L('/admin/audit-logs', Shield, t('nav.audit')), L('/admin/settings', Settings, t('nav.settings'))] },
      ]
    : isHqAdmin
      ? [
          { items: [L('/admin', LayoutDashboard, t('nav.dashboard')), L('/admin/area-managers', Users, t('nav.areaManagers')), L('/admin/dealers', Store, t('nav.dealers'))] },
          { title: t('nav.gMore'), items: [L('/admin/visits', MapPin, t('nav.visits')), L('/admin/media', Image, t('nav.media')), L('/admin/reports', FileText, t('nav.reports')), L('/admin/audit-logs', Shield, t('nav.audit')), L('/admin/settings', Settings, t('nav.settings'))] },
        ]
      : isAreaManager
        ? [{ items: [L('/area-manager', LayoutDashboard, t('nav.dashboard')), L('/area-manager/sheet', FileText, t('nav.sendSheet')), L('/area-manager/dealers', Store, t('nav.myDealers')), L('/area-manager/videos', Clapperboard, t('nav.videos')), L('/area-manager/media', Image, t('nav.approve')), L('/area-manager/visits', MapPin, t('nav.visits')), L('/area-manager/reports', ClipboardList, t('nav.reports'))] }]
        : [{ items: [L('/dealer', LayoutDashboard, t('nav.dashboard')), L('/dealer/videos', Clapperboard, t('nav.videos')), L('/dealer/upload', Upload, t('nav.upload')), L('/dealer/posts', Image, t('nav.posts')), L('/dealer/visits', MapPin, t('nav.visitHistory')), L('/dealer/profile', User, t('nav.profile'))] }];
  const homePath = isSuperAdmin ? '/super-admin' : isHqAdmin ? '/admin' : isAreaManager ? '/area-manager' : '/dealer';
  const workspace = isSuperAdmin ? 'sa' : isHqAdmin ? 'ho' : isAreaManager ? 'am' : 'dl';
  const workspaceLabel = t(`roles.${user?.role || 'dealer'}`);

  const handleLogout = () => {
    logout();
    navigate(portalLoginPath(user?.role));
  };

  return (
    <div className={`layout workspace-${workspace}`}>
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
          <NotificationBell />
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
            <p className="workspace-chip">{workspaceLabel}</p>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <nav className="sidebar-nav">
            {groups.map((g, gi) => (
              <div key={gi} className="nav-block">
                {g.title && <p className="nav-label">{g.title}</p>}
                {g.items.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} end={to === homePath} onClick={() => setSidebarOpen(false)}>
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
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
