import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

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

router.post('/logout', logout);

router.get('/me', authenticate, getMe);

export default router;
