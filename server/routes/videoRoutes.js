import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { verifyUploadedFiles } from '../utils/fileSecurity.js';
import { enforceRenderQuota, enforceUploadQuota } from '../middleware/rateLimits.js';
import {
  getVideo,
  listVideos,
  getVideoTrail,
  publishVideo,
  renderNow,
  sendToAm,
  retryPublish,
  reviewVideo,
  saveDraft,
  uploadVideo,
} from '../controllers/videoController.js';

const assets = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'watermark', maxCount: 1 },
  { name: 'intro', maxCount: 1 },
  { name: 'outro', maxCount: 1 },
  { name: 'music', maxCount: 1 },
  { name: 'srt', maxCount: 1 },
  { name: 'merge', maxCount: 6 },
]);

const router = Router();
router.use(protect);

router.get('/', listVideos);
router.get('/:id/trail', getVideoTrail);
router.get('/:id', getVideo);
router.post('/', authorize('super_admin', 'dealer'), enforceUploadQuota, assets, verifyUploadedFiles, uploadVideo);
router.patch('/:id', authorize('super_admin'), assets, verifyUploadedFiles, saveDraft);
router.post('/:id/render', authorize('super_admin'), enforceRenderQuota, renderNow);
router.post('/:id/send-am', authorize('super_admin'), enforceRenderQuota, sendToAm);
router.post('/:id/review', authorize('super_admin', 'area_manager'), reviewVideo);
router.post('/:id/publish', authorize('super_admin'), publishVideo);
router.post('/:id/retry', authorize('super_admin'), retryPublish);

export default router;
