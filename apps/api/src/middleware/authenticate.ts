import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, hashToken } from '../lib/auth';
import { prisma } from '../lib/database';
import { cacheGet, CacheKeys } from '../lib/redis';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    sessionId: string;
  };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.substring(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
}

// Verify session is not revoked (check Redis/DB)
export async function validateSession(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) return next();

  const cacheKey = CacheKeys.userSession(req.user.sessionId);
  const cached = await cacheGet<boolean>(cacheKey);

  if (cached === false) {
    // Explicitly revoked session
    return next(new AppError('Session has been revoked', 401, 'SESSION_REVOKED'));
  }

  if (cached === null) {
    // Check DB on cache miss
    const session = await prisma.userSession.findUnique({
      where: { id: req.user.sessionId },
    });

    if (!session || session.expiresAt < new Date()) {
      return next(new AppError('Session expired', 401, 'SESSION_EXPIRED'));
    }
  }

  next();
}

// Patient can only access their own data (or care team members can access assigned patients)
export function requirePatientAccess(patientIdParam: string = 'patientId') {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));

    const { role, userId } = req.user;

    // Admins and care team have full access
    if (['ADMIN', 'CLINICIAN', 'CARE_COORDINATOR'].includes(role)) {
      return next();
    }

    // Patients can only access their own data
    const targetPatientId = req.params[patientIdParam] || req.body.patientId;

    if (!targetPatientId) return next();

    const patient = await prisma.patientProfile.findFirst({
      where: { id: targetPatientId, userId },
    });

    if (!patient) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }

    next();
  };
}
