import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getJobStatus } from '../controllers/job.controller.js';

const router = Router();

router.get('/:id', authenticate, getJobStatus);

export default router;
