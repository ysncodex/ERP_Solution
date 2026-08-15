import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createMovement,
  deleteMovement,
  getAccounts,
  getBalances,
  getMovement,
  listMovements,
} from './funds.controller.js';

const router = Router();

router.use(authenticate);

router.get('/balances', asyncHandler(getBalances));
router.get('/accounts', asyncHandler(getAccounts));

router.get('/', asyncHandler(listMovements));
router.get('/:id', asyncHandler(getMovement));

router.post('/', requireRole('owner', 'manager'), asyncHandler(createMovement));
router.delete('/:id', requireRole('owner', 'manager'), asyncHandler(deleteMovement));

export default router;
