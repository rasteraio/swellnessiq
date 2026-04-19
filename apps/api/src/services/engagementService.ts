import { prisma } from '../lib/database';
import { AIRecommendationEngine } from './aiRecommendationEngine';
import { NotificationService } from './notificationService';
import { logger } from '../lib/logger';
import { cacheDel, CacheKeys } from '../lib/redis';

export class EngagementService {

  static async updateEngagementLevel(patientId: string): Promise<void> {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        progress: { orderBy: { updatedAt: 'desc' }, take: 30 },
        learningPlan: {
          include: {
            scheduledModules: {
              where: { scheduledDate: { lte: new Date() } },
            },
          },
        },
      },
    });

    if (!patient) return;

    // Engagement metrics
    const daysPostDischarge = Math.floor(
      (Date.now() - patient.dischargeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dueModules = patient.learningPlan?.scheduledModules.filter(
      sm => sm.scheduledDate <= new Date()
    ) || [];

    const completedDue = dueModules.filter(sm => sm.status === 'COMPLETED').length;
    const completionRate = dueModules.length > 0 ? completedDue / dueModules.length : 1;

    const lastActivity = patient.progress[0]?.updatedAt;
    const daysSinceLastActivity = lastActivity
      ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : daysPostDischarge;

    // Determine engagement level
    let engagementLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'AT_RISK';

    if (completionRate >= 0.8 && daysSinceLastActivity <= 2) {
      engagementLevel = 'HIGH';
    } else if (completionRate >= 0.5 && daysSinceLastActivity <= 5) {
      engagementLevel = 'MEDIUM';
    } else if (completionRate >= 0.3 || daysSinceLastActivity <= 7) {
      engagementLevel = 'LOW';
    } else {
      engagementLevel = 'AT_RISK';
    }

    const previousLevel = patient.engagementLevel;

    await prisma.patientProfile.update({
      where: { id: patientId },
      data: { engagementLevel },
    });

    await cacheDel(CacheKeys.patient(patientId));

    // If engagement dropped, trigger adaptation and nudge
    if (engagementLevel === 'LOW' || engagementLevel === 'AT_RISK') {
      if (previousLevel !== engagementLevel) {
        logger.warn('Patient engagement dropped', { patientId, from: previousLevel, to: engagementLevel });

        // Fire nudge notification
        const nudge = await AIRecommendationEngine.generateNudge(patientId);
        await NotificationService.sendToPatient(patientId, {
          type: 'MODULE_REMINDER',
          title: "Your health journey awaits",
          body: nudge,
          channel: 'IN_APP',
        });
      }

      if (engagementLevel === 'AT_RISK') {
        // Alert care team
        await prisma.alert.create({
          data: {
            patientId,
            severity: 'MEDIUM',
            type: 'ENGAGEMENT',
            message: `Patient engagement is AT_RISK: ${daysSinceLastActivity} days since last activity, ${(completionRate * 100).toFixed(0)}% completion rate`,
          },
        });
      }
    }

    // Update analytics snapshot
    await EngagementService.updateAnalyticsSnapshot(patientId, {
      engagementLevel,
      completionRate,
      daysSinceLastActivity,
    });
  }

  static async computeStreak(patientId: string): Promise<number> {
    const progress = await prisma.patientProgress.findMany({
      where: { patientId, status: 'COMPLETED', completedAt: { not: null } },
      select: { completedAt: true },
      orderBy: { completedAt: 'desc' },
    });

    if (progress.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const activityDays = new Set(
      progress.map(p => {
        const d = new Date(p.completedAt!);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    for (let i = 0; i < 180; i++) {
      if (activityDays.has(currentDate.getTime())) {
        streak++;
      } else if (i > 0) {
        break;
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  private static async updateAnalyticsSnapshot(
    patientId: string,
    metrics: { engagementLevel: string; completionRate: number; daysSinceLastActivity: number }
  ): Promise<void> {
    const riskScore = await AIRecommendationEngine.computeRiskScore(patientId);
    const streak = await EngagementService.computeStreak(patientId);

    await prisma.patientAnalyticsSnapshot.create({
      data: {
        patientId,
        moduleCompletionRate: metrics.completionRate,
        streakDays: streak,
        predictedReadmissionRisk: riskScore,
        engagementTrend: metrics.daysSinceLastActivity <= 2 ? 'IMPROVING' :
          metrics.daysSinceLastActivity <= 5 ? 'STABLE' : 'DECLINING',
        lastActiveAt: new Date(Date.now() - metrics.daysSinceLastActivity * 86400000),
      },
    });

    // Update patient risk score
    await prisma.patientProfile.update({
      where: { id: patientId },
      data: { riskScore },
    });
  }
}
