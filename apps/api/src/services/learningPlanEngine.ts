/**
 * LearningPlanEngine — Core adaptive learning orchestrator
 *
 * Responsibilities:
 *  1. Generate initial learning plan at discharge
 *  2. Schedule modules based on post-discharge timeline
 *  3. Adapt plan in real-time based on engagement, scores, conditions
 *  4. Apply branching logic after exercise responses
 */

import { prisma } from '../lib/database';
import { cacheSet, cacheDel, CacheKeys } from '../lib/redis';
import { logger } from '../lib/logger';
import { AIRecommendationEngine } from './aiRecommendationEngine';

interface AdaptationContext {
  condition?: string;
  exerciseId?: string;
  score?: number;
  engagement?: string;
  moduleId?: string;
}

export class LearningPlanEngine {

  /**
   * Generate a patient's initial learning plan based on their profile.
   * Called once at discharge/onboarding.
   */
  static async generateInitialPlan(patientId: string): Promise<void> {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: { comorbidities: true, medications: true },
    });

    if (!patient) throw new Error(`Patient ${patientId} not found`);

    // Fetch all active modules applicable to this patient
    const applicableModules = await prisma.learningModule.findMany({
      where: {
        isActive: true,
        targetConditions: {
          some: {
            condition: {
              in: [
                patient.primaryCondition,
                ...patient.comorbidities.map(c => c.condition),
              ],
            },
          },
        },
      },
      include: { targetConditions: true, prerequisites: true },
      orderBy: [{ daysPostDischarge: 'asc' }, { difficulty: 'asc' }],
    });

    // Add polypharmacy module if patient has >= 5 medications
    if (patient.medications.length >= 5) {
      const polypharmacyModules = await prisma.learningModule.findMany({
        where: { type: 'POLYPHARMACY', isActive: true },
        orderBy: { daysPostDischarge: 'asc' },
      });
      for (const m of polypharmacyModules) {
        if (!applicableModules.find(am => am.id === m.id)) {
          applicableModules.push({ ...m, targetConditions: [], prerequisites: [] });
        }
      }
    }

    // Schedule modules on the post-discharge timeline
    const scheduledModules = applicableModules.map((module, index) => ({
      moduleId: module.id,
      scheduledDate: this.calculateScheduledDate(patient.dischargeDate, module.daysPostDischarge),
      status: 'LOCKED' as const,
      isAdaptive: false,
      order: index,
    }));

    // Create or replace learning plan
    await prisma.learningPlan.upsert({
      where: { patientId },
      create: {
        patientId,
        scheduledModules: { create: scheduledModules },
      },
      update: {
        lastAdaptedAt: new Date(),
        scheduledModules: {
          deleteMany: {},
          create: scheduledModules,
        },
      },
    });

    await cacheDel(CacheKeys.patientPlan(patientId));

    logger.info('Learning plan generated', {
      patientId,
      moduleCount: scheduledModules.length,
      primaryCondition: patient.primaryCondition,
    });
  }

  /**
   * Adapt the learning plan based on a triggering event.
   * Called after exercise completion, condition change, or engagement drop.
   */
  static async adaptPlan(
    patientId: string,
    trigger: string,
    context: AdaptationContext
  ): Promise<void> {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        comorbidities: true,
        learningPlan: {
          include: {
            scheduledModules: { include: { module: { include: { branchingRules: true } } } },
          },
        },
      },
    });

    if (!patient?.learningPlan) return;

    const plan = patient.learningPlan;
    const modulesAdded: string[] = [];
    const modulesRemoved: string[] = [];
    let explanation = '';

    // ── Branching: low score after exercise ───────────────────────────────────
    if (trigger === 'EXERCISE_COMPLETED' && context.score !== undefined && context.score < 60) {
      const failedModule = plan.scheduledModules.find(
        sm => sm.moduleId === context.moduleId
      );

      if (failedModule) {
        const rules = failedModule.module.branchingRules.filter(
          r => r.conditionType === 'SCORE'
            && r.actionType === 'ADD_MODULE'
            && r.targetModuleId
        );

        for (const rule of rules) {
          const alreadyScheduled = plan.scheduledModules.some(
            sm => sm.moduleId === rule.targetModuleId
          );

          if (!alreadyScheduled && rule.targetModuleId) {
            await prisma.scheduledModule.create({
              data: {
                planId: plan.id,
                moduleId: rule.targetModuleId,
                scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days out
                status: 'AVAILABLE',
                isAdaptive: true,
                adaptationReason: `Reinforcement: low score (${context.score}%) on ${failedModule.module.title || 'previous module'}`,
                order: plan.scheduledModules.length + modulesAdded.length,
              },
            });
            modulesAdded.push(rule.targetModuleId);
          }
        }
        explanation = `Added reinforcement modules due to low quiz score (${context.score}%)`;
      }
    }

    // ── AI-driven: engagement drop ────────────────────────────────────────────
    if (trigger === 'ENGAGEMENT_DROP' || context.engagement === 'LOW' || context.engagement === 'AT_RISK') {
      const aiRecs = await AIRecommendationEngine.getRecommendations(patientId);

      for (const rec of aiRecs.slice(0, 2)) {
        const alreadyScheduled = plan.scheduledModules.some(sm => sm.moduleId === rec.moduleId);
        if (!alreadyScheduled) {
          await prisma.scheduledModule.create({
            data: {
              planId: plan.id,
              moduleId: rec.moduleId,
              scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
              status: 'AVAILABLE',
              isAdaptive: true,
              adaptationReason: `AI recommendation: ${rec.reason}`,
              order: plan.scheduledModules.length + modulesAdded.length,
            },
          });
          modulesAdded.push(rec.moduleId);
        }
      }
      explanation = explanation || 'Added AI-recommended modules due to engagement drop';
    }

    // ── Condition added: inject relevant modules ───────────────────────────────
    if (trigger === 'CONDITION_ADDED' && context.condition) {
      const newModules = await prisma.learningModule.findMany({
        where: {
          isActive: true,
          type: 'COMORBIDITY',
          targetConditions: { some: { condition: context.condition as any } },
        },
        orderBy: { daysPostDischarge: 'asc' },
      });

      for (const mod of newModules) {
        const alreadyScheduled = plan.scheduledModules.some(sm => sm.moduleId === mod.id);
        if (!alreadyScheduled) {
          await prisma.scheduledModule.create({
            data: {
              planId: plan.id,
              moduleId: mod.id,
              scheduledDate: this.calculateScheduledDate(
                patient.dischargeDate, mod.daysPostDischarge
              ),
              status: 'LOCKED',
              isAdaptive: true,
              adaptationReason: `New condition added: ${context.condition}`,
              order: plan.scheduledModules.length + modulesAdded.length,
            },
          });
          modulesAdded.push(mod.id);
        }
      }
      explanation = explanation || `Added modules for new condition: ${context.condition}`;
    }

    if (modulesAdded.length > 0 || modulesRemoved.length > 0) {
      await prisma.learningPlan.update({
        where: { id: plan.id },
        data: {
          lastAdaptedAt: new Date(),
          adaptationCount: { increment: 1 },
          adaptationEvents: {
            create: {
              trigger,
              modulesAdded,
              modulesRemoved,
              explanation,
            },
          },
        },
      });

      await cacheDel(CacheKeys.patientPlan(patientId));

      logger.info('Learning plan adapted', {
        patientId,
        trigger,
        modulesAdded: modulesAdded.length,
        modulesRemoved: modulesRemoved.length,
      });
    }
  }

  /**
   * Unlock modules whose scheduled date has arrived.
   * Called by the daily scheduler cron job.
   */
  static async unlockDueModules(): Promise<number> {
    const now = new Date();

    const result = await prisma.scheduledModule.updateMany({
      where: {
        status: 'LOCKED',
        scheduledDate: { lte: now },
      },
      data: { status: 'AVAILABLE', actualDeliveryDate: now },
    });

    if (result.count > 0) {
      logger.info(`Unlocked ${result.count} modules`);
    }

    return result.count;
  }

  /**
   * Calculate the real-world date for a module based on post-discharge day.
   */
  private static calculateScheduledDate(dischargeDate: Date, daysPostDischarge: number): Date {
    const date = new Date(dischargeDate);
    date.setDate(date.getDate() + daysPostDischarge);
    return date;
  }

  /**
   * Process exercise response and apply branching rules.
   */
  static async processExerciseResponse(
    patientId: string,
    moduleId: string,
    exerciseId: string,
    score: number
  ): Promise<void> {
    // Evaluate branching rules for this exercise
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: { branchingRules: true },
    });

    if (!exercise) return;

    for (const rule of exercise.branchingRules) {
      const conditionMet = this.evaluateCondition(rule, score);
      if (!conditionMet) continue;

      if (rule.actionType === 'ESCALATE_TO_CARE_TEAM') {
        await prisma.alert.create({
          data: {
            patientId,
            severity: 'HIGH',
            type: 'ENGAGEMENT',
            message: rule.alertMessage || `Patient needs follow-up after ${exercise.prompt}`,
          },
        });
      }

      if (rule.actionType === 'ADD_MODULE' || rule.actionType === 'UNLOCK_MODULE') {
        await this.adaptPlan(patientId, 'EXERCISE_COMPLETED', { exerciseId, score, moduleId });
      }
    }
  }

  private static evaluateCondition(rule: any, score: number): boolean {
    if (rule.conditionType === 'SCORE') {
      const threshold = parseFloat(rule.conditionValue);
      switch (rule.conditionOperator) {
        case 'LT': return score < threshold;
        case 'LTE': return score <= threshold;
        case 'GT': return score > threshold;
        case 'GTE': return score >= threshold;
        case 'EQ': return score === threshold;
        default: return false;
      }
    }
    return false;
  }
}
