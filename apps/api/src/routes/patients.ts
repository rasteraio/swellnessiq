import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { cacheGet, cacheSet, cacheDel, CacheKeys } from '../lib/redis';
import { authenticate, requireRole, requirePatientAccess, AuthRequest } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import { LearningPlanEngine } from '../services/learningPlanEngine';

const router = Router();

router.use(authenticate);

const updatePatientSchema = z.object({
  preferredLanguage: z.string().optional(),
  zipCode: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.string().optional(),
  insuranceType: z.string().optional(),
  accessibilityConfig: z.object({
    largeText: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    screenReader: z.boolean().optional(),
    simplifiedLanguage: z.boolean().optional(),
    preferredMediaType: z.enum(['VIDEO', 'AUDIO', 'TEXT']).optional(),
    captionsEnabled: z.boolean().optional(),
  }).optional(),
});

// GET /api/v1/patients/me — current patient's own profile
router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;

    const cached = await cacheGet(CacheKeys.patient(userId));
    if (cached) return res.json({ success: true, data: cached });

    const patient = await prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        comorbidities: true,
        medications: { where: { isActive: true } },
        accessibilityConfig: true,
        careTeam: { include: { members: { include: { user: { select: { firstName: true, lastName: true } } } } } },
        learningPlan: {
          include: {
            scheduledModules: {
              where: { status: { in: ['AVAILABLE', 'IN_PROGRESS'] } },
              include: { module: true },
              orderBy: { scheduledDate: 'asc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!patient) throw new AppError('Patient profile not found', 404, 'NOT_FOUND');

    await cacheSet(CacheKeys.patient(userId), patient, 300);

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/patients/:id — care team access
router.get('/:id', requireRole('CLINICIAN', 'CARE_COORDINATOR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const cached = await cacheGet(CacheKeys.patient(id));
    if (cached) return res.json({ success: true, data: cached });

    const patient = await prisma.patientProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        comorbidities: true,
        medications: { where: { isActive: true } },
        accessibilityConfig: true,
        alerts: { where: { isAcknowledged: false }, orderBy: { createdAt: 'desc' } },
        learningPlan: {
          include: {
            scheduledModules: {
              include: { module: true },
              orderBy: { scheduledDate: 'asc' },
            },
          },
        },
      },
    });

    if (!patient) throw new AppError('Patient not found', 404, 'NOT_FOUND');

    await cacheSet(CacheKeys.patient(id), patient, 120);

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/patients — list patients (care team)
router.get('/', requireRole('CLINICIAN', 'CARE_COORDINATOR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 100);
    const condition = req.query.condition as string;
    const engagementLevel = req.query.engagementLevel as string;
    const search = req.query.search as string;

    const where: any = {};
    if (condition) where.primaryCondition = condition;
    if (engagementLevel) where.engagementLevel = engagementLevel;
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [patients, total] = await Promise.all([
      prisma.patientProfile.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          comorbidities: true,
          alerts: { where: { isAcknowledged: false }, select: { id: true, severity: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ riskScore: 'desc' }, { updatedAt: 'desc' }],
      }),
      prisma.patientProfile.count({ where }),
    ]);

    res.json({
      success: true,
      data: patients,
      meta: { page, pageSize, total, hasMore: page * pageSize < total },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/patients/:id
router.patch('/:id', requirePatientAccess(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updatePatientSchema.parse(req.body);

    const { accessibilityConfig, ...patientData } = data;

    const updated = await prisma.patientProfile.update({
      where: { id },
      data: {
        ...patientData,
        ...(accessibilityConfig ? {
          accessibilityConfig: {
            upsert: {
              create: accessibilityConfig,
              update: accessibilityConfig,
            },
          },
        } : {}),
      },
      include: { accessibilityConfig: true },
    });

    await cacheDel(CacheKeys.patient(id));

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/patients/:id/conditions
router.post('/:id/conditions', requireRole('CLINICIAN', 'CARE_COORDINATOR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { condition, isPrimary, diagnosedAt, notes } = req.body;

    const added = await prisma.patientCondition.upsert({
      where: { patientId_condition: { patientId: id, condition } },
      create: { patientId: id, condition, isPrimary: isPrimary || false, diagnosedAt, notes },
      update: { isPrimary: isPrimary || false, notes },
    });

    // Re-adapt learning plan when conditions change
    await LearningPlanEngine.adaptPlan(id, 'CONDITION_ADDED', { condition });

    await cacheDel(CacheKeys.patient(id));
    await cacheDel(CacheKeys.patientPlan(id));

    res.json({ success: true, data: added });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/patients/:id/dashboard
router.get('/:id/dashboard', requirePatientAccess(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patientProfile.findUnique({
      where: { id },
      include: {
        learningPlan: {
          include: {
            scheduledModules: {
              include: { module: true },
              where: { status: { in: ['AVAILABLE', 'IN_PROGRESS', 'COMPLETED'] } },
              orderBy: { scheduledDate: 'asc' },
            },
          },
        },
        alerts: { where: { isAcknowledged: false }, orderBy: { severity: 'desc' }, take: 5 },
        progress: { where: { status: 'COMPLETED' }, select: { id: true, completedAt: true, score: true } },
        vitalLogs: { orderBy: { loggedAt: 'desc' }, take: 10 },
      },
    });

    if (!patient) throw new AppError('Patient not found', 404, 'NOT_FOUND');

    const completedCount = patient.progress.length;
    const totalScheduled = patient.learningPlan?.scheduledModules.length || 0;
    const nextModule = patient.learningPlan?.scheduledModules
      .find(m => m.status === 'AVAILABLE');

    const daysPostDischarge = Math.floor(
      (Date.now() - patient.dischargeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      data: {
        patient: { id: patient.id, dischargeDate: patient.dischargeDate, primaryCondition: patient.primaryCondition, riskScore: patient.riskScore, engagementLevel: patient.engagementLevel },
        daysPostDischarge,
        progress: { completed: completedCount, total: totalScheduled, rate: totalScheduled > 0 ? completedCount / totalScheduled : 0 },
        nextModule,
        alerts: patient.alerts,
        recentVitals: patient.vitalLogs,
        upcomingModules: patient.learningPlan?.scheduledModules
          .filter(m => m.status === 'AVAILABLE')
          .slice(0, 3) || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
