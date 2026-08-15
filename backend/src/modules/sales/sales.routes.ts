import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createSale,
  deleteSale,
  getSale,
  listSales,
  recentSales,
  salesStats,
  updateSale,
} from './sales.controller.js';

const router = Router();

router.use(authenticate);

// Static routes must precede the dynamic `/:id` route.
router.get('/stats', asyncHandler(salesStats));
router.get('/recent', asyncHandler(recentSales));
router.get('/', asyncHandler(listSales));
router.get('/:id', asyncHandler(getSale));

router.post('/', requireRole('owner', 'manager'), asyncHandler(createSale));
router.put('/:id', requireRole('owner', 'manager'), asyncHandler(updateSale));
router.delete('/:id', requireRole('owner', 'manager'), asyncHandler(deleteSale));

export default router;
