import { Router } from 'express';
import { getMedia, uploadMedia, approveMedia, deleteMedia } from '../controllers/mediaController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/', getMedia);
router.post('/upload', upload.single('file'), uploadMedia);
router.patch('/:id/approve', authorize('admin', 'area_manager'), approveMedia);
router.delete('/:id', authorize('admin', 'dealer'), deleteMedia);

export default router;
