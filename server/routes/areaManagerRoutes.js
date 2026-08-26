import { Router } from 'express';
import {
  getAreaManagers,
  getAreaManager,
  createAreaManager,
  updateAreaManager,
  deleteAreaManager,
  toggleAreaManagerStatus,
} from '../controllers/areaManagerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', authorize('admin'), getAreaManagers);
router.get('/:id', authorize('admin'), getAreaManager);
router.post('/', authorize('admin'), createAreaManager);
router.put('/:id', authorize('admin'), updateAreaManager);
router.delete('/:id', authorize('admin'), deleteAreaManager);
router.patch('/:id/toggle-status', authorize('admin'), toggleAreaManagerStatus);

export default router;
