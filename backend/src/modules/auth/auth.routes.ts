import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginController, verifyController, visitorLoginController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

const limiterOptions = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
} as const;

/** Throttle brute-force attempts against the password login endpoint. */
const loginLimiter = rateLimit({
  ...limiterOptions,
  max: 20,
  message: { message: 'Too many login attempts. Please try again later.' },
});

/** Visitor explore is passwordless — allow more traffic from a shared LinkedIn demo. */
const visitorLimiter = rateLimit({
  ...limiterOptions,
  max: 80,
  message: { message: 'Too many visitor sessions. Please try again later.' },
});

router.post('/login', loginLimiter, asyncHandler(loginController));
router.post('/visitor', visitorLimiter, asyncHandler(visitorLoginController));
router.get('/verify', authenticate, asyncHandler(verifyController));

export default router;
