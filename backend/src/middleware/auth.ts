import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthRequest extends Request {
  userId?: string;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    try {
      const payload = jwt.verify(token, config.auth.jwtSecret) as { sub: string };
      req.userId = payload.sub;
    } catch {
      // ignore invalid tokens for optional auth
    }
  }
  next();
};
