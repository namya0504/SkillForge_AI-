import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProgress, updateProgress, getProgressSummary } from '../controllers/progress.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getProgress);
router.get('/summary', getProgressSummary);
router.put('/:itemId', updateProgress);

export default router;
