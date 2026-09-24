import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { verifyUploadedFiles } from '../utils/fileSecurity.js';
import { createSocialPost, getSocialConfig, getSocialPosts } from '../controllers/socialController.js';

const router = Router();
router.use(protect, authorize('super_admin'));

router.get('/config', getSocialConfig);
router.get('/', getSocialPosts);
router.post('/', upload.array('images', 10), verifyUploadedFiles, createSocialPost);

export default router;
