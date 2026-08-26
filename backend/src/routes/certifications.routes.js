import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getCertificationProgress,
  updateCertificationStatus
} from '../controllers/certifications.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/progress', getCertificationProgress);
router.put('/progress/:certIdentifier', updateCertificationStatus);

export default router;
