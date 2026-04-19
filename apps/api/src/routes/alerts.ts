import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/database';
import { authenticate, requireRole, requirePatientAccess, AuthRequest } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/v1/alerts/patient/:patientId
router.get('/patient/:patientId', requirePatientAccess(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { patientId: req.params.patientId },
      orderBy: [{ isAcknowledged: 'asc' }, { severity: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/alerts — all unacknowledged (care team)
router.get('/', requireRole('CLINICIAN', 'CARE_COORDINATOR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const severity = req.query.severity as string;
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = 20;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where: {
          isAcknowledged: false,
          ...(severity ? { severity: severity as any } : {}),
        },
        include: {
          patient: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.alert.count({ where: { isAcknowledged: false } }),
    ]);

    res.json({
      success: true,
      data: alerts,
      meta: { page, pageSize, total, hasMore: page * pageSize < total },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/alerts/:id/acknowledge
router.patch('/:id/acknowledge', requireRole('CLINICIAN', 'CARE_COORDINATOR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: {
        isAcknowledged: true,
        acknowledgedBy: req.user!.userId,
        acknowledgedAt: new Date(),
      },
    });
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

export default router;
