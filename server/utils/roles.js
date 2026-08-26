export const HQ_ROLES = ['super_admin', 'admin'];

export const isHqRole = (role) => HQ_ROLES.includes(role);

export const isSuperAdmin = (role) => role === 'super_admin';
