import { verifyToken } from '../utils/token.js';

export const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication required' });
  }
};
