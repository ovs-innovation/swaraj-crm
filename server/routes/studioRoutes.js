import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { verifyUploadedFiles } from '../utils/fileSecurity.js';
import {
  addLibrary,
  addTimelineComment,
  aiAssist,
  applyTemplate,
  deleteLibrary,
  deleteTemplate,
  getAnalytics,
  getRenderQueue,
  listLibrary,
  listNotifications,
  listTemplates,
  markNotifications,
  restoreVersion,
  saveTemplate,
} from '../controllers/studioExtras.js';
import { getHealth } from '../controllers/healthController.js';

const router = Router();
router.use(protect);

router.get('/notifications', listNotifications);
router.post('/notifications/read', markNotifications);
router.post('/ai', authorize('super_admin'), aiAssist);

router.get('/health', authorize('super_admin'), getHealth);
router.get('/queue', authorize('super_admin'), getRenderQueue);
router.get('/library', authorize('super_admin'), listLibrary);
router.post('/library', authorize('super_admin'), upload.single('file'), verifyUploadedFiles, addLibrary);
router.delete('/library/:id', authorize('super_admin'), deleteLibrary);
router.get('/templates', authorize('super_admin', 'area_manager'), listTemplates);
router.post('/templates', authorize('super_admin'), saveTemplate);
router.delete('/templates/:id', authorize('super_admin'), deleteTemplate);

router.post('/videos/:id/restore/:index', authorize('super_admin'), restoreVersion);
router.post('/videos/:id/comments', authorize('super_admin', 'area_manager'), addTimelineComment);
router.get('/videos/:id/analytics', authorize('super_admin'), getAnalytics);
router.post('/videos/:id/template', authorize('super_admin'), applyTemplate);

export default router;
