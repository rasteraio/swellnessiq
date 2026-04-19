import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/database';
import { cacheGet, cacheSet, cacheDel, CacheKeys } from '../lib/redis';
import { authenticate, requirePatientAccess, AuthRequest } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import { LearningPlanEngine } from '../services/learningPlanEngine';

const router = Router();
router.use(authenticate);

// GET /api/v1/learning-plans/:patientId
router.get('/:patientId', requirePatientAccess(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const cached = await cacheGet(CacheKeys.patientPlan(patientId));
    if (cached) return res.json({ success: true, data: cached });

    const plan = await prisma.learningPlan.findUnique({
      where: { patientId },
      include: {
        scheduledModules: {
          include: {
            module: {
              select: {
                id: true, title: true, type: true, description: true,
                estimatedMinutes: true, thumbnailUrl: true, difficulty: true,
              },
            },
          },
          orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
        },
        adaptationEvents: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!plan) throw new AppError('Learning plan not found', 404, 'NOT_FOUND');

    await cacheSet(CacheKeys.patientPlan(patientId), plan, 300);
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/learning-plans/:patientId/generate
router.post('/:patientId/generate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    await LearningPlanEngine.generateInitialPlan(patientId);
    await cacheDel(CacheKeys.patientPlan(patientId));

    const plan = await prisma.learningPlan.findUnique({
      where: { patientId },
      include: {
        scheduledModules: {
          include: { module: true },
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

export default router;
