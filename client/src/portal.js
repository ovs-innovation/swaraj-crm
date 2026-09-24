export const PORTAL_PORTS = {
  super_admin: 5173,
  admin: 5174,
  area_manager: 5175,
  dealer: 5176,
};

export const PORTAL_PATHS = {
  super_admin: '/login/super-admin',
  admin: '/login/admin',
  area_manager: '/login/area-manager',
  dealer: '/login/dealer',
};

export const PORTAL_HINT = {
  super_admin: 'superadmin@vastora.com · super123',
  admin: 'admin@vastora.com · admin123',
  area_manager: 'Own AM email · default password manager123',
  dealer: 'Own dealer email · default password dealer123',
};

export const getPortalRole = () => {
  const baked = import.meta.env.VITE_APP_ROLE;
  if (baked) return baked;
  if (typeof window === 'undefined') return '';
  const byPort = {
    5173: 'super_admin',
    5174: 'admin',
    5175: 'area_manager',
    5176: 'dealer',
  };
  if (byPort[window.location.port]) return byPort[window.location.port];
  const path = window.location.pathname;
  if (path.startsWith('/login/super-admin')) return 'super_admin';
  if (path.startsWith('/login/admin')) return 'admin';
  if (path.startsWith('/login/area-manager')) return 'area_manager';
  if (path.startsWith('/login/dealer')) return 'dealer';
  return '';
};

export const portalLoginPath = (role) => PORTAL_PATHS[role] || '/login';
