import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { validateFileType } from '../middleware/fileValidator.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadResume, getResumeStatus } from '../controllers/resume.controller.js';

const router = Router();

router.post('/upload', authenticate, uploadLimiter, uploadSingle, validateFileType, uploadResume);
router.get('/current', authenticate, getResumeStatus);

export default router;
