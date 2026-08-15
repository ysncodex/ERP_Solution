import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createMenuItem,
  deleteMenuItem,
  getMenuItem,
  listMenu,
  toggleMenuAvailability,
  updateMenuItem,
} from './menu.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(listMenu));
router.get('/:id', asyncHandler(getMenuItem));

router.post('/', requireRole('owner', 'manager'), asyncHandler(createMenuItem));
router.put('/:id', requireRole('owner', 'manager'), asyncHandler(updateMenuItem));
router.patch('/:id/availability', requireRole('owner', 'manager'), asyncHandler(toggleMenuAvailability));
router.delete('/:id', requireRole('owner', 'manager'), asyncHandler(deleteMenuItem));

export default router;
