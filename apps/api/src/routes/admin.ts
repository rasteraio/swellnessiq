import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/authenticate';
import { LearningPlanEngine } from '../services/learningPlanEngine';
import { EngagementService } from '../services/engagementService';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

// POST /api/v1/admin/patients/:patientId/generate-plan
router.post('/patients/:patientId/generate-plan', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await LearningPlanEngine.generateInitialPlan(req.params.patientId);
    res.json({ success: true, data: { message: 'Plan generated' } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/unlock-modules
router.post('/unlock-modules', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await LearningPlanEngine.unlockDueModules();
    res.json({ success: true, data: { unlockedCount: count } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/audit-logs
router.get('/audit-logs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = 50;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ success: true, data: logs, meta: { page, pageSize, total } });
  } catch (err) {
    next(err);
  }
});

export default router;
