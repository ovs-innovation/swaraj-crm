import { Router } from 'express';
import {
  getVisits,
  getVisit,
  createVisit,
  updateVisit,
  deleteVisit,
} from '../controllers/visitController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getVisits);
router.get('/:id', getVisit);
router.post('/', createVisit);
router.put('/:id', updateVisit);
router.delete('/:id', deleteVisit);

export default router;
