import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './shared/context/AuthContext';
import ProtectedRoute from './shared/components/ProtectedRoute';
import Layout from './shared/components/Layout';
import Login from './pages/Login';

import SuperAdminDashboard from './admin/SuperAdminDashboard';
import AdminDashboard from './admin/Dashboard';
import AreaManagers from './admin/AreaManagers';
import AuditLogs from './admin/AuditLogs';
import Settings from './admin/Settings';
import Users from './admin/Users';
import LetterheadEditor from './admin/LetterheadEditor';
import BulkPosters from './shared/pages/BulkPosters';
import AmSheetUpload from './area-manager/SheetUpload';

import AreaManagerDashboard from './area-manager/Dashboard';
import DealerDashboard from './dealer/Dashboard';
import DealerProfilePage from './dealer/Profile';
import DealerUpload from './dealer/Upload';
import DealerMedia from './dealer/Media';
import DealerVisits from './dealer/Visits';

import Dealers from './shared/pages/Dealers';
import DealerProfile from './shared/pages/DealerProfile';
import Visits from './shared/pages/Visits';
import MediaPage from './shared/pages/Media';
import Reports from './shared/pages/Reports';

const HomeRedirect = () => {
  const { user, loading, getHomePath } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomePath(user.role)} replace />;
};

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<HomeRedirect />} />

    <Route element={<ProtectedRoute roles={['super_admin']} />}>
      <Route element={<Layout />}>
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/letterhead" element={<LetterheadEditor />} />
        <Route path="/super-admin/posters" element={<BulkPosters />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute roles={['super_admin', 'admin']} />}>
      <Route element={<Layout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/area-managers" element={<AreaManagers />} />
        <Route path="/admin/dealers" element={<Dealers basePath="/admin" />} />
        <Route path="/admin/dealers/:id" element={<DealerProfile />} />
        <Route path="/admin/visits" element={<Visits />} />
        <Route path="/admin/media" element={<MediaPage adminMode />} />
        <Route path="/admin/posters" element={<BulkPosters />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/audit-logs" element={<AuditLogs />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute roles={['area_manager']} />}>
      <Route element={<Layout />}>
        <Route path="/area-manager" element={<AreaManagerDashboard />} />
        <Route path="/area-manager/dealers" element={<Dealers basePath="/area-manager" />} />
        <Route path="/area-manager/dealers/:id" element={<DealerProfile />} />
        <Route path="/area-manager/visits" element={<Visits />} />
        <Route path="/area-manager/media" element={<MediaPage approvalMode />} />
        <Route path="/area-manager/sheet" element={<AmSheetUpload />} />
        <Route path="/area-manager/reports" element={<Reports />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute roles={['dealer']} />}>
      <Route element={<Layout />}>
        <Route path="/dealer" element={<DealerDashboard />} />
        <Route path="/dealer/profile" element={<DealerProfilePage />} />
        <Route path="/dealer/upload" element={<DealerUpload />} />
        <Route path="/dealer/posts" element={<DealerMedia />} />
        <Route path="/dealer/visits" element={<DealerVisits />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
