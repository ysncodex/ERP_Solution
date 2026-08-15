import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  customReport,
  dailyReport,
  exportReport,
  monthlyReport,
  profitLossReport,
} from './reports.controller.js';

const router = Router();

router.use(authenticate);

router.get('/daily', asyncHandler(dailyReport));
router.get('/monthly', asyncHandler(monthlyReport));
router.get('/profit-loss', asyncHandler(profitLossReport));
router.get('/custom', asyncHandler(customReport));
router.get('/export', asyncHandler(exportReport));

export default router;
