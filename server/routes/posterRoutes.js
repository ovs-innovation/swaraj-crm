import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { submitSheet, getSheets, getSheet, savePosters, sendToAreaManager, getPosters, reviewPoster, updatePoster, bulkDeletePosters, deletePoster } from '../controllers/posterController.js';

const router = Router();
router.use(protect);

router.post('/sheets', authorize('area_manager'), upload.single('file'), submitSheet);
router.get('/sheets', authorize('super_admin', 'admin', 'area_manager'), getSheets);
router.get('/sheets/:id', authorize('super_admin', 'admin', 'area_manager'), getSheet);
router.post('/sheets/:id/send', authorize('super_admin', 'admin'), sendToAreaManager);
router.post('/save', authorize('super_admin', 'admin'), upload.array('files', 80), savePosters);
router.post('/bulk-delete', authorize('super_admin', 'admin'), bulkDeletePosters);
router.get('/', authorize('super_admin', 'admin', 'area_manager'), getPosters);
router.patch('/:id/review', authorize('super_admin', 'admin', 'area_manager'), reviewPoster);
router.patch('/:id', authorize('super_admin', 'admin'), upload.single('file'), updatePoster);
router.delete('/:id', authorize('super_admin', 'admin'), deletePoster);

export default router;
