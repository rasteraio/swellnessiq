import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticate, requirePatientAccess, AuthRequest } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const VITAL_THRESHOLDS: Record<string, { min?: number; max?: number }> = {
  WEIGHT: {},
  BLOOD_PRESSURE_SYSTOLIC: { min: 90, max: 180 },
  BLOOD_PRESSURE_DIASTOLIC: { min: 60, max: 120 },
  HEART_RATE: { min: 50, max: 120 },
  OXYGEN_SATURATION: { min: 92, max: 100 },
  TEMPERATURE: { min: 96.8, max: 100.4 },
  BLOOD_GLUCOSE: { min: 70, max: 300 },
  RESPIRATORY_RATE: { min: 12, max: 25 },
};

const vitalSchema = z.object({
  patientId: z.string(),
  type: z.enum(['WEIGHT', 'BLOOD_PRESSURE_SYSTOLIC', 'BLOOD_PRESSURE_DIASTOLIC', 'HEART_RATE', 'OXYGEN_SATURATION', 'TEMPERATURE', 'BLOOD_GLUCOSE', 'RESPIRATORY_RATE']),
  value: z.number(),
  unit: z.string(),
  notes: z.string().optional(),
  loggedAt: z.string().datetime().optional(),
});

// POST /api/v1/vitals
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = vitalSchema.parse(req.body);
    const threshold = VITAL_THRESHOLDS[data.type] || {};
    const isAbnormal =
      (threshold.min !== undefined && data.value < threshold.min) ||
      (threshold.max !== undefined && data.value > threshold.max);

    const vital = await prisma.vitalLog.create({
      data: {
        patientId: data.patientId,
        type: data.type as any,
        value: data.value,
        unit: data.unit,
        notes: data.notes,
        isAbnormal,
        loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
      },
    });

    // Create alert for abnormal vitals
    if (isAbnormal) {
      await prisma.alert.create({
        data: {
          patientId: data.patientId,
          severity: 'HIGH',
          type: 'VITAL',
          message: `Abnormal vital recorded: ${data.type} = ${data.value} ${data.unit}. Normal range: ${threshold.min ?? 'N/A'} - ${threshold.max ?? 'N/A'}`,
        },
      });
    }

    res.status(201).json({ success: true, data: vital });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/vitals/:patientId
router.get('/:patientId', requirePatientAccess(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const type = req.query.type as string;
    const days = parseInt(req.query.days as string || '30', 10);

    const vitals = await prisma.vitalLog.findMany({
      where: {
        patientId,
        ...(type ? { type: type as any } : {}),
        loggedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
      orderBy: { loggedAt: 'asc' },
    });

    // Group by type for charting
    const grouped = vitals.reduce((acc: Record<string, any[]>, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push({ value: v.value, unit: v.unit, isAbnormal: v.isAbnormal, loggedAt: v.loggedAt });
      return acc;
    }, {});

    res.json({ success: true, data: { raw: vitals, grouped } });
  } catch (err) {
    next(err);
  }
});

export default router;
