import { Router } from 'express';
import {
  getAuditLogs,
  getSettings,
  updateSettings,
  uploadLetterhead,
  getDealerReport,
  getVisitReport,
  getUploadReport,
  getStateWiseReport,
  getAreaWiseReport,
} from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/audit-logs', authorize('admin'), getAuditLogs);
router.get('/dealers', authorize('admin'), getDealerReport);
router.get('/visits', getVisitReport);
router.get('/uploads', getUploadReport);
router.get('/state-wise', authorize('admin'), getStateWiseReport);
router.get('/area-wise', authorize('admin'), getAreaWiseReport);

const settingsRouter = Router();
settingsRouter.use(protect);
settingsRouter.get('/', getSettings);
settingsRouter.put('/', authorize('admin'), updateSettings);
settingsRouter.post('/letterhead', authorize('super_admin'), upload.single('file'), uploadLetterhead);

export { router as reportRoutes, settingsRouter };
