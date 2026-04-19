import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticate, requirePatientAccess, AuthRequest } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import { ChatService } from '../services/chatService';
import { rateLimit } from 'express-rate-limit';

const router = Router();
router.use(authenticate);

// Stricter rate limit for chat (AI calls are expensive)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many chat messages' } },
});

// POST /api/v1/chat/sessions — create new session
router.post('/sessions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!patient) throw new AppError('Patient profile not found', 404, 'NOT_FOUND');

    const sessionId = await ChatService.createSession(patient.id);
    res.status(201).json({ success: true, data: { sessionId } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/chat/sessions — list sessions
router.get('/sessions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!patient) throw new AppError('Patient not found', 404, 'NOT_FOUND');

    const sessions = await prisma.chatSession.findMany({
      where: { patientId: patient.id },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/chat/sessions/:id — get session with messages
router.get('/sessions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: req.params.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        patient: { select: { userId: true } },
      },
    });

    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (session.patient.userId !== req.user!.userId && !['CLINICIAN', 'CARE_COORDINATOR', 'ADMIN'].includes(req.user!.role)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/chat/sessions/:id/messages — send message
router.post('/sessions/:id/messages', chatLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);

    const session = await prisma.chatSession.findUnique({
      where: { id: req.params.id },
      include: { patient: { select: { id: true, userId: true } } },
    });

    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (session.patient.userId !== req.user!.userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const response = await ChatService.sendMessage(
      session.id,
      session.patient.id,
      message
    );

    res.json({ success: true, data: { response } });
  } catch (err) {
    next(err);
  }
});

export default router;
