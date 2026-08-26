import { Router } from 'express';
import {
  getSuperAdminDashboard,
  getAdminDashboard,
  getAreaManagerDashboard,
  getDealerDashboard,
  getActivities,
} from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/super-admin', authorize('super_admin'), getSuperAdminDashboard);
router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/area-manager', authorize('area_manager'), getAreaManagerDashboard);
router.get('/dealer', authorize('dealer'), getDealerDashboard);
router.get('/activities', authorize('admin', 'area_manager'), getActivities);

export default router;
