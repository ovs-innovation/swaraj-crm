import { Router } from 'express';
import {
  getDealers,
  getDealer,
  getMyDealerProfile,
  createDealer,
  updateDealer,
  deleteDealer,
  assignDealer,
  getAssignmentHistory,
  getDealerProfile,
  createDealerLogin,
} from '../controllers/dealerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/me/profile', authorize('dealer'), getMyDealerProfile);
router.get('/', getDealers);
router.get('/:id/profile', getDealerProfile);
router.get('/:id/assignment-history', authorize('admin'), getAssignmentHistory);
router.get('/:id', getDealer);
router.post('/', authorize('admin', 'area_manager'), createDealer);
router.post('/:id/login', authorize('admin', 'area_manager'), createDealerLogin);
router.put('/:id', authorize('admin', 'area_manager'), updateDealer);
router.delete('/:id', authorize('admin', 'area_manager'), deleteDealer);
router.post('/:id/assign', authorize('admin'), assignDealer);

export default router;
