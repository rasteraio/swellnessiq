/**
 * Scheduler — Cron jobs for time-based module delivery and analytics
 *
 * Jobs:
 *  - Hourly:  Unlock modules whose scheduled date has arrived
 *  - Daily:   Update engagement levels + risk scores
 *  - Daily:   Send module available notifications
 *  - Daily:   Send reminders to patients with available-but-incomplete modules
 *  - Weekly:  Refresh cohort analytics
 */

import cron from 'node-cron';
import { prisma } from '../lib/database';
import { LearningPlanEngine } from '../services/learningPlanEngine';
import { EngagementService } from '../services/engagementService';
import { NotificationService } from '../services/notificationService';
import { logger } from '../lib/logger';

export function startScheduler(): void {

  // ── Every hour: unlock due modules ────────────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const unlocked = await LearningPlanEngine.unlockDueModules();
      if (unlocked > 0) {
        await notifyUnlockedModules();
      }
    } catch (err) {
      logger.error('Scheduler: unlock modules failed', { error: err });
    }
  });

  // ── Daily at 9am: send reminders for available modules ─────────────────────
  cron.schedule('0 9 * * *', async () => {
    try {
      await sendDailyReminders();
    } catch (err) {
      logger.error('Scheduler: daily reminders failed', { error: err });
    }
  });

  // ── Daily at midnight: update all engagement levels ────────────────────────
  cron.schedule('0 0 * * *', async () => {
    try {
      await updateAllEngagementLevels();
    } catch (err) {
      logger.error('Scheduler: engagement update failed', { error: err });
    }
  });

  // ── Weekly: schedule reinforcement modules ────────────────────────────────
  cron.schedule('0 6 * * 1', async () => {
    try {
      await scheduleReinforcementModules();
    } catch (err) {
      logger.error('Scheduler: reinforcement scheduling failed', { error: err });
    }
  });

  logger.info('All cron jobs scheduled');
}

async function notifyUnlockedModules(): Promise<void> {
  // Find newly available scheduled modules where notification hasn't been sent
  const newlyAvailable = await prisma.scheduledModule.findMany({
    where: {
      status: 'AVAILABLE',
      actualDeliveryDate: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // last hour
      },
    },
    include: {
      module: { select: { id: true, title: true } },
      plan: { select: { patientId: true } },
    },
  });

  for (const sm of newlyAvailable) {
    await NotificationService.sendModuleAvailableNotification(
      sm.plan.patientId,
      sm.module.title,
      sm.module.id
    );
  }

  logger.info(`Notified patients about ${newlyAvailable.length} new modules`);
}

async function sendDailyReminders(): Promise<void> {
  // Patients with available-but-not-started modules for > 24 hours
  const overdue = await prisma.scheduledModule.findMany({
    where: {
      status: 'AVAILABLE',
      actualDeliveryDate: {
        lte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    include: {
      module: { select: { id: true, title: true } },
      plan: {
        include: {
          patient: {
            select: { id: true, engagementLevel: true },
          },
        },
      },
    },
    take: 500, // process in batches
  });

  for (const sm of overdue) {
    const patient = sm.plan.patient;
    if (['LOW', 'AT_RISK', 'MEDIUM'].includes(patient.engagementLevel)) {
      await NotificationService.scheduleModuleReminder(
        patient.id,
        sm.module.title,
        sm.module.id,
        new Date()
      );
    }
  }

  logger.info(`Sent ${overdue.length} module reminders`);
}

async function updateAllEngagementLevels(): Promise<void> {
  const patients = await prisma.patientProfile.findMany({
    where: { user: { isActive: true } },
    select: { id: true },
  });

  logger.info(`Updating engagement for ${patients.length} patients`);

  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < patients.length; i += batchSize) {
    const batch = patients.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(p => EngagementService.updateEngagementLevel(p.id))
    );
  }
}

async function scheduleReinforcementModules(): Promise<void> {
  // Find patients who completed modules > 14 days ago without reinforcement
  const reinforcementModules = await prisma.learningModule.findMany({
    where: { type: 'REINFORCEMENT', isActive: true },
    select: { id: true, refreshIntervalDays: true, targetConditions: true },
  });

  for (const mod of reinforcementModules) {
    const intervalDays = mod.refreshIntervalDays || 14;

    const eligiblePatients = await prisma.patientProgress.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          lte: new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000),
        },
        // No existing reinforcement module scheduled
        patient: {
          learningPlan: {
            scheduledModules: {
              none: { moduleId: mod.id },
            },
          },
        },
      },
      select: { patientId: true },
      distinct: ['patientId'],
      take: 200,
    });

    for (const { patientId } of eligiblePatients) {
      const plan = await prisma.learningPlan.findUnique({ where: { patientId } });
      if (!plan) continue;

      await prisma.scheduledModule.create({
        data: {
          planId: plan.id,
          moduleId: mod.id,
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
          status: 'AVAILABLE',
          isAdaptive: true,
          adaptationReason: `Scheduled reinforcement refresh (every ${intervalDays} days)`,
          order: 999,
        },
      });
    }
  }

  logger.info('Reinforcement modules scheduled');
}
