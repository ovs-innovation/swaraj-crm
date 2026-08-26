export const canAccessDealer = async (user, dealerId) => {
  if (!dealerId) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  if (user.role === 'dealer') return user.dealerRef?.toString() === dealerId.toString();

  if (user.role === 'area_manager') {
    const Dealer = (await import('../models/Dealer.js')).default;
    const dealer = await Dealer.findById(dealerId).select('areaManager');
    return dealer?.areaManager?.toString() === user.areaManagerRef?.toString();
  }

  return false;
};

export const getHomePath = (role) => {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'admin') return '/admin';
  if (role === 'area_manager') return '/area-manager';
  if (role === 'dealer') return '/dealer';
  return '/login';
};
