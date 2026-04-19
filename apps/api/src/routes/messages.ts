import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticate, requirePatientAccess, AuthRequest } from '../middleware/authenticate';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

const messageSchema = z.object({
  patientId: z.string(),
  content: z.string().min(1).max(5000),
  threadId: z.string().optional(),
  attachments: z.array(z.string().url()).optional(),
});

// GET /api/v1/messages/patient/:patientId
router.get('/patient/:patientId', requirePatientAccess(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const messages = await prisma.careMessage.findMany({
      where: { patientId: req.params.patientId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by thread
    const threads = messages.reduce((acc: Record<string, any[]>, msg) => {
      if (!acc[msg.threadId]) acc[msg.threadId] = [];
      acc[msg.threadId].push(msg);
      return acc;
    }, {});

    res.json({ success: true, data: { threads, messages } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/messages
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = messageSchema.parse(req.body);
    const threadId = data.threadId || crypto.randomUUID();

    const message = await prisma.careMessage.create({
      data: {
        patientId: data.patientId,
        authorId: req.user!.userId,
        threadId,
        content: data.content,
        attachments: data.attachments || [],
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/messages/:id/read
router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await prisma.careMessage.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

export default router;
