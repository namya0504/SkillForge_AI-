import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import {
  createSession,
  getSessions,
  getSessionMessages,
  sendMessageStream,
  deleteSession
} from '../controllers/chat.controller.js';

const router = express.Router();

// Dedicated rate limiter for chat endpoints
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // 40 messages per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You have reached your chat message limit. Please wait a few minutes before sending more messages.' }
});

router.use(authenticate);

router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.get('/sessions/:id/messages', getSessionMessages);
router.post('/sessions/:id/message', chatLimiter, sendMessageStream);
router.delete('/sessions/:id', deleteSession);

export default router;
