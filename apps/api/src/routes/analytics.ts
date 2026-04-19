import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/database';
import { cacheGet, cacheSet, CacheKeys } from '../lib/redis';
import { authenticate, requireRole, requirePatientAccess, AuthRequest } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

// GET /api/v1/analytics/patient/:patientId
router.get('/patient/:patientId', requirePatientAccess(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const cacheKey = CacheKeys.patientAnalytics(patientId);
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const [progress, snapshots, alerts, plan] = await Promise.all([
      prisma.patientProgress.findMany({
        where: { patientId },
        include: { module: { select: { title: true, type: true, estimatedMinutes: true } } },
      }),
      prisma.patientAnalyticsSnapshot.findMany({
        where: { patientId },
        orderBy: { snapshotDate: 'desc' },
        take: 30,
      }),
      prisma.alert.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.learningPlan.findUnique({
        where: { patientId },
        include: {
          scheduledModules: true,
          adaptationEvents: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      }),
    ]);

    const completed = progress.filter(p => p.status === 'COMPLETED');
    const totalModules = plan?.scheduledModules.length || 0;
    const completionRate = totalModules > 0 ? completed.length / totalModules : 0;
    const avgScore = completed.filter(p => p.score !== null)
      .reduce((sum, p, _, arr) => sum + (p.score || 0) / arr.length, 0);
    const totalMinutes = completed.reduce((sum, p) => sum + p.timeSpentSeconds / 60, 0);

    // Score trend over last 10 completions
    const scoreTrend = completed
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 10)
      .reverse()
      .map(p => ({ date: p.completedAt, score: p.score, module: p.module.title }));

    // Engagement over time from snapshots
    const engagementHistory = snapshots.map(s => ({
      date: s.snapshotDate,
      completionRate: s.moduleCompletionRate,
      riskScore: s.predictedReadmissionRisk,
      trend: s.engagementTrend,
    }));

    // Module type breakdown
    const typeBreakdown = completed.reduce((acc: Record<string, number>, p) => {
      acc[p.module.type] = (acc[p.module.type] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      summary: {
        completionRate,
        avgScore,
        totalEngagementMinutes: Math.round(totalMinutes),
        totalModulesCompleted: completed.length,
        totalModulesAvailable: totalModules,
        alertCount: alerts.length,
        unresolvedAlerts: alerts.filter(a => !a.isAcknowledged).length,
        currentRiskScore: snapshots[0]?.predictedReadmissionRisk || 0,
        streakDays: snapshots[0] ? 0 : 0, // populated by EngagementService
      },
      scoreTrend,
      engagementHistory,
      typeBreakdown,
      recentAdaptations: plan?.adaptationEvents || [],
    };

    await cacheSet(cacheKey, analytics, 300);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/cohort — aggregate metrics (care team)
router.get('/cohort', requireRole('CLINICIAN', 'CARE_COORDINATOR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cacheKey = CacheKeys.cohortAnalytics();
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const [
      totalPatients,
      activePatients,
      conditionBreakdown,
      engagementBreakdown,
      avgRisk,
    ] = await Promise.all([
      prisma.patientProfile.count(),
      prisma.patientProfile.count({
        where: {
          progress: {
            some: {
              updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      }),
      prisma.patientProfile.groupBy({ by: ['primaryCondition'], _count: { id: true } }),
      prisma.patientProfile.groupBy({ by: ['engagementLevel'], _count: { id: true } }),
      prisma.patientProfile.aggregate({ _avg: { riskScore: true } }),
    ]);

    const cohort = {
      totalPatients,
      activePatients,
      averageRiskScore: avgRisk._avg.riskScore || 0,
      conditionBreakdown: Object.fromEntries(conditionBreakdown.map(c => [c.primaryCondition, c._count.id])),
      engagementBreakdown: Object.fromEntries(engagementBreakdown.map(e => [e.engagementLevel, e._count.id])),
    };

    await cacheSet(cacheKey, cohort, 600);
    res.json({ success: true, data: cohort });
  } catch (err) {
    next(err);
  }
});

export default router;
