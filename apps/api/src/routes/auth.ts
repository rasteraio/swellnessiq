import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { redis, CacheKeys, cacheSet } from '../lib/redis';
import {
  hashPassword, verifyPassword, signAccessToken, signRefreshToken,
  verifyRefreshToken, hashToken, generateSecureToken,
} from '../lib/auth';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(['PATIENT', 'CARE_COORDINATOR', 'CLINICIAN']).default('PATIENT'),
  phone: z.string().optional(),
  // Patient-specific fields
  dischargeDate: z.string().datetime().optional(),
  primaryCondition: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/v1/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as any,
        phone: data.phone,
        ...(data.role === 'PATIENT' && data.dischargeDate && data.primaryCondition ? {
          patient: {
            create: {
              dischargeDate: new Date(data.dischargeDate),
              primaryCondition: data.primaryCondition as any,
              accessibilityConfig: { create: {} },
            },
          },
        } : {}),
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, passwordHash: true, role: true, isActive: true,
        firstName: true, lastName: true,
        patient: { select: { id: true, primaryCondition: true, engagementLevel: true, riskScore: true } },
      },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
    }

    // Create session
    const refreshToken = generateSecureToken();
    const tokenHash = hashToken(refreshToken);

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceInfo: req.headers['user-agent'],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = signAccessToken({ userId: user.id, role: user.role, sessionId: session.id });
    const refreshTokenSigned = signRefreshToken({ userId: user.id, sessionId: session.id });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenSigned,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, patient: user.patient ?? undefined },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400, 'MISSING_TOKEN');

    const payload = verifyRefreshToken(refreshToken);

    const session = await prisma.userSession.findFirst({
      where: { id: payload.sessionId, userId: payload.userId },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401, 'SESSION_EXPIRED');
    }

    if (!session.user.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
    }

    const accessToken = signAccessToken({
      userId: session.user.id,
      role: session.user.role,
      sessionId: session.id,
    });

    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.user!.sessionId;

    await prisma.userSession.delete({ where: { id: sessionId } });

    // Mark session as revoked in cache
    await cacheSet(CacheKeys.userSession(sessionId), false, 15 * 60);

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, phone: true, createdAt: true,
        patient: {
          select: {
            id: true, dischargeDate: true, primaryCondition: true,
            engagementLevel: true, riskScore: true,
          },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
