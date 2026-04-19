import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticate, AuthRequest, requirePatientAccess } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import { LearningPlanEngine } from '../services/learningPlanEngine';
import { EngagementService } from '../services/engagementService';

const router = Router();
router.use(authenticate);

const startModuleSchema = z.object({ patientId: z.string() });

const completeModuleSchema = z.object({
  patientId: z.string(),
  timeSpentSeconds: z.number().min(0),
  responses: z.array(z.object({
    exerciseId: z.string(),
    selectedOptionId: z.string().optional(),
    freeTextResponse: z.string().optional(),
    numericValue: z.number().optional(),
  })),
});

// POST /api/v1/progress/:moduleId/start
router.post('/:moduleId/start', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patientId } = startModuleSchema.parse(req.body);
    const { moduleId } = req.params;

    // Verify module is available for this patient
    const scheduled = await prisma.scheduledModule.findFirst({
      where: { plan: { patientId }, moduleId, status: { in: ['AVAILABLE', 'IN_PROGRESS'] } },
    });

    if (!scheduled) throw new AppError('Module not available', 400, 'MODULE_NOT_AVAILABLE');

    const progress = await prisma.patientProgress.upsert({
      where: { patientId_moduleId: { patientId, moduleId } },
      create: { patientId, moduleId, status: 'IN_PROGRESS', startedAt: new Date() },
      update: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    // Update scheduled status
    await prisma.scheduledModule.update({
      where: { id: scheduled.id },
      data: { status: 'IN_PROGRESS' },
    });

    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/progress/:moduleId/complete
router.post('/:moduleId/complete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patientId, timeSpentSeconds, responses } = completeModuleSchema.parse(req.body);
    const { moduleId } = req.params;

    const module = await prisma.learningModule.findUnique({
      where: { id: moduleId },
      include: { exercises: { include: { options: true } } },
    });

    if (!module) throw new AppError('Module not found', 404, 'NOT_FOUND');

    // Calculate score from quiz responses
    let totalPoints = 0;
    let earnedPoints = 0;
    const exerciseResponses: any[] = [];

    for (const response of responses) {
      const exercise = module.exercises.find(e => e.id === response.exerciseId);
      if (!exercise) continue;

      if (exercise.type === 'QUIZ' && exercise.maxScore) {
        totalPoints += exercise.maxScore;
        const correctOption = exercise.options.find(o => o.isCorrect);
        if (correctOption && response.selectedOptionId === correctOption.id) {
          earnedPoints += exercise.maxScore;
        }
      }

      exerciseResponses.push({ ...response });
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : null;

    // Compute engagement score (time spent vs estimated)
    const expectedSeconds = module.estimatedMinutes * 60;
    const engagementScore = Math.min(100, (timeSpentSeconds / expectedSeconds) * 100);

    // Update progress record
    const progress = await prisma.$transaction(async (tx) => {
      const prog = await tx.patientProgress.upsert({
        where: { patientId_moduleId: { patientId, moduleId } },
        create: {
          patientId,
          moduleId,
          status: 'COMPLETED',
          completedAt: new Date(),
          score,
          timeSpentSeconds,
          engagementScore,
          attemptCount: 1,
        },
        update: {
          status: 'COMPLETED',
          completedAt: new Date(),
          score,
          timeSpentSeconds: { increment: timeSpentSeconds },
          engagementScore,
          attemptCount: { increment: 1 },
          responses: {
            create: exerciseResponses.map(r => ({
              exerciseId: r.exerciseId,
              selectedOptionId: r.selectedOptionId,
              freeTextResponse: r.freeTextResponse,
              numericValue: r.numericValue,
              score: null,
            })),
          },
        },
      });

      // Mark scheduled module as completed
      await tx.scheduledModule.updateMany({
        where: { plan: { patientId }, moduleId },
        data: { status: 'COMPLETED' },
      });

      return prog;
    });

    // Fire async adaptive logic (non-blocking)
    Promise.all([
      LearningPlanEngine.processExerciseResponse(patientId, moduleId, responses[0]?.exerciseId || '', score || 0),
      EngagementService.updateEngagementLevel(patientId),
    ]).catch(err => console.error('Async adaptation failed:', err));

    res.json({
      success: true,
      data: {
        progress,
        score,
        passed: score === null || score >= (module.exercises[0]?.masteryThreshold || 80),
        feedback: score !== null
          ? score >= 80 ? 'Excellent work!' : score >= 60 ? 'Good effort! Review the key points.' : 'Keep practicing — a refresher module has been added to your plan.'
          : 'Module completed!',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/progress/patient/:patientId
router.get('/patient/:patientId', requirePatientAccess(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const progress = await prisma.patientProgress.findMany({
      where: { patientId: req.params.patientId },
      include: { module: { select: { title: true, type: true, estimatedMinutes: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
});

export default router;
