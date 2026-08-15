import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createSupplierHandler,
  deleteSupplierHandler,
  getSupplierHandler,
  listSuppliersHandler,
  updateSupplierHandler,
} from './suppliers.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(listSuppliersHandler));
router.get('/:id', asyncHandler(getSupplierHandler));
router.post('/', requireRole('owner', 'manager'), asyncHandler(createSupplierHandler));
router.put('/:id', requireRole('owner', 'manager'), asyncHandler(updateSupplierHandler));
router.delete('/:id', requireRole('owner', 'manager'), asyncHandler(deleteSupplierHandler));

export default router;
