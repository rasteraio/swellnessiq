import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { cacheGet, cacheSet, cacheDel, CacheKeys } from '../lib/redis';
import { authenticate, requireRole, AuthRequest } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import { AIRecommendationEngine } from '../services/aiRecommendationEngine';

const router = Router();
router.use(authenticate);

// GET /api/v1/modules — list modules with filtering
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as string;
    const condition = req.query.condition as string;
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 50);

    const cacheKey = `modules:list:${type || 'all'}:${condition || 'all'}:${page}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const where: any = { isActive: true };
    if (type) where.type = type;
    if (condition) {
      where.targetConditions = { some: { condition } };
    }

    const [modules, total] = await Promise.all([
      prisma.learningModule.findMany({
        where,
        include: {
          targetConditions: true,
          _count: { select: { contentBlocks: true, exercises: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ daysPostDischarge: 'asc' }, { difficulty: 'asc' }],
      }),
      prisma.learningModule.count({ where }),
    ]);

    await cacheSet(cacheKey, modules, 600);

    res.json({
      success: true,
      data: modules,
      meta: { page, pageSize, total, hasMore: page * pageSize < total },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/modules/:id — full module with content
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cacheKey = CacheKeys.module(req.params.id);
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const module = await prisma.learningModule.findUnique({
      where: { id: req.params.id },
      include: {
        targetConditions: true,
        contentBlocks: { orderBy: { order: 'asc' } },
        exercises: {
          orderBy: { order: 'asc' },
          include: { options: true },
        },
        branchingRules: true,
        prerequisites: { include: { prerequisite: { select: { id: true, title: true } } } },
      },
    });

    if (!module) throw new AppError('Module not found', 404, 'NOT_FOUND');

    // Apply accessibility simplification if needed
    const patientId = req.query.patientId as string;
    let processedModule = module;

    if (patientId) {
      const patient = await prisma.patientProfile.findUnique({
        where: { id: patientId },
        include: { accessibilityConfig: true },
      });

      if (patient?.accessibilityConfig?.simplifiedLanguage) {
        // Simplify text content blocks
        const simplifiedBlocks = await Promise.all(
          module.contentBlocks.map(async (block) => {
            if (block.type === 'TEXT') {
              return {
                ...block,
                content: await AIRecommendationEngine.simplifyContent(block.content, patientId),
              };
            }
            return block;
          })
        );
        processedModule = { ...module, contentBlocks: simplifiedBlocks };
      }
    }

    await cacheSet(cacheKey, processedModule, 3600);

    res.json({ success: true, data: processedModule });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/modules — create module (admin/clinician)
router.post('/', requireRole('ADMIN', 'CLINICIAN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const moduleSchema = z.object({
      slug: z.string(),
      title: z.string(),
      description: z.string(),
      type: z.enum(['CORE_CONDITION', 'SELF_MONITORING', 'COMORBIDITY', 'POLYPHARMACY', 'SOCIAL_DETERMINANTS', 'REINFORCEMENT']),
      estimatedMinutes: z.number().default(5),
      daysPostDischarge: z.number(),
      difficulty: z.number().min(1).max(5).default(1),
      targetConditions: z.array(z.object({ condition: z.string(), isPrimary: z.boolean().default(false) })),
      refreshIntervalDays: z.number().optional(),
    });

    const data = moduleSchema.parse(req.body);
    const { targetConditions, ...moduleData } = data;

    const module = await prisma.learningModule.create({
      data: {
        ...moduleData,
        targetConditions: {
          create: targetConditions.map(tc => ({ condition: tc.condition as any, isPrimary: tc.isPrimary })),
        },
      },
      include: { targetConditions: true },
    });

    res.status(201).json({ success: true, data: module });
  } catch (err) {
    next(err);
  }
});

export default router;
