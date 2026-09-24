import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, getHomePath } from '../context/AuthContext';
import { getPortalRole, portalLoginPath } from '../../portal';

const ProtectedRoute = ({ roles }) => {
  const { user, loading, logout } = useAuth();
  const portal = getPortalRole();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to={portalLoginPath(portal)} replace />;
  if (portal && user.role !== portal) {
    logout();
    return <Navigate to={portalLoginPath(portal)} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
