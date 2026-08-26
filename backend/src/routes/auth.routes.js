import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, logout, getMe, forgotPassword, resetPassword, sendOTP, verifyOTP, refreshSession, deleteAccount } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/send-otp',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  validate,
  sendOTP
);

router.post('/verify-otp',
  authLimiter,
  [
    body('otpToken').notEmpty().withMessage('Verification token is required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code is required')
  ],
  validate,
  verifyOTP
);

router.post('/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/\d/).withMessage('Password must contain a number')
  ],
  validate,
  register
);

router.post('/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

router.post('/refresh', refreshSession);

router.post('/logout', logout);

router.get('/me', authenticate, getMe);

router.post('/forgot-password',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  validate,
  forgotPassword
);

router.post('/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/\d/).withMessage('Password must contain a number')
  ],
  validate,
  resetPassword
);

router.delete('/account', authenticate, deleteAccount);

export default router;
