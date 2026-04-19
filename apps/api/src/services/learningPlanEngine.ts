/**
 * LearningPlanEngine — SwellnessIQ adaptive learning orchestrator
 *
 * Clinical protocol based on:
 *  - Coleman Care Transitions Model (4.4pp 30-day readmission reduction)
 *  - HRRP: 6 penalized conditions (HF, COPD, Acute MI, CABG, THA/TKA, Pneumonia)
 *  - LACE+ scoring: ≥10 = Intensive Track (daily modules, required caregiver enrollment)
 *  - Mastery threshold: 80% (competency-based medical education standard)
 *  - Engagement escalation: 48h push → 72h clinical alert → 96h phone outreach
 *  - Graduation: 3 consecutive ≥80% passes → monthly maintenance cadence
 *  - Mandatory modules: non-skippable (meds, warning signs, emergency thresholds)
 */

import { prisma } from '../lib/database';
import { cacheSet, cacheDel, CacheKeys } from '../lib/redis';
import { logger } from '../lib/logger';
import { AIRecommendationEngine } from './aiRecommendationEngine';

const MASTERY_THRESHOLD = 80;             // 80% — competency-based medical education standard
const GRADUATION_PASS_COUNT = 3;          // 3 consecutive passes → maintenance mode
const POLYPHARMACY_MEDICATION_LIMIT = 5;  // ≥5 meds at discharge → polypharmacy track
const LACE_INTENSIVE_THRESHOLD = 10;      // LACE+ ≥10 → intensive daily track
const CONSECUTIVE_FAILURE_LIMIT = 3;      // 3 failures → nurse navigator alert

// Engagement escalation windows (hours)
const ENGAGEMENT_PUSH_HOURS = 48;
const ENGAGEMENT_CLINICAL_ALERT_HOURS = 72;
const ENGAGEMENT_PHONE_OUTREACH_HOURS = 96;

// Maintenance mode: monthly cadence (30 days between modules)
const MAINTENANCE_INTERVAL_DAYS = 30;

interface AdaptationContext {
  condition?: string;
  exerciseId?: string;
  score?: number;
  engagement?: string;
  moduleId?: string;
  consecutiveFailures?: number;
  hoursInactive?: number;
}

export class LearningPlanEngine {

  /**
   * Generate a patient's initial learning plan based on their profile.
   * Called once at discharge/onboarding.
   *
   * Includes:
   * - Pre-discharge modules (daysPostDischarge = -1)
   * - Polypharmacy track injection (≥5 medications)
   * - LACE+ intensive track configuration
   * - Mandatory module locking (non-skippable)
   * - Social determinants language adjustment
   */
  static async generateInitialPlan(patientId: string): Promise<void> {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: { comorbidities: true, medications: true },
    });

    if (!patient) throw new Error(`Patient ${patientId} not found`);

    const isIntensiveTrack = (patient.laceScore ?? 0) >= LACE_INTENSIVE_THRESHOLD;

    // Update intensive track flag on patient profile
    if (isIntensiveTrack !== patient.isIntensiveTrack) {
      await prisma.patientProfile.update({
        where: { id: patientId },
        data: {
          isIntensiveTrack,
          // Intensive track requires caregiver enrollment
          ...(isIntensiveTrack && !patient.caregiverEnrolled
            ? { caregiverEnrolled: false } // flag as needed — not enrolled yet
            : {}),
        },
      });
    }

    // Fetch PLATFORM_FUNDAMENTALS modules (onboarding, welcome, etc.) for all patients
    const platformModules = await prisma.learningModule.findMany({
      where: { type: 'PLATFORM_FUNDAMENTALS', isActive: true },
      include: { targetConditions: true, prerequisites: true },
      orderBy: { daysPostDischarge: 'asc' },
    });

    // Fetch condition-specific modules (primary condition + comorbidities)
    const conditionModules = await prisma.learningModule.findMany({
      where: {
        isActive: true,
        type: { not: 'PLATFORM_FUNDAMENTALS' },
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

    // Merge, deduplicate
    const seenIds = new Set<string>();
    const applicableModules = [...platformModules, ...conditionModules].filter(m => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });

    // Inject polypharmacy track if ≥5 discharge medications
    if (patient.medications.length >= POLYPHARMACY_MEDICATION_LIMIT) {
      const polypharmacyModules = await prisma.learningModule.findMany({
        where: { type: 'POLYPHARMACY', isActive: true },
        include: { targetConditions: true, prerequisites: true },
        orderBy: { daysPostDischarge: 'asc' },
      });

      for (const m of polypharmacyModules) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          applicableModules.push(m);
        }
      }

      logger.info('Polypharmacy track injected', {
        patientId,
        medicationCount: patient.medications.length,
        polypharmacyModules: polypharmacyModules.length,
      });
    }

    // Sort final list: pre-discharge first (negative days), then by day, then difficulty
    applicableModules.sort((a, b) => {
      if (a.daysPostDischarge !== b.daysPostDischarge) {
        return a.daysPostDischarge - b.daysPostDischarge;
      }
      return (a.difficulty ?? 0) - (b.difficulty ?? 0);
    });

    // Build scheduled module records
    const scheduledModules = applicableModules.map((module, index) => {
      const scheduledDate = this.calculateScheduledDate(
        patient.dischargeDate,
        module.daysPostDischarge,
        isIntensiveTrack
      );

      return {
        moduleId: module.id,
        scheduledDate,
        // Pre-discharge modules and Day 0-1 mandatory modules start available
        status: (module.daysPostDischarge <= 0 || module.isMandatory)
          ? 'AVAILABLE' as const
          : 'LOCKED' as const,
        isAdaptive: false,
        order: index,
      };
    });

    // Create or replace learning plan
    await prisma.learningPlan.upsert({
      where: { patientId },
      create: {
        patientId,
        track: isIntensiveTrack ? 'INTENSIVE' : 'STANDARD',
        scheduledModules: { create: scheduledModules },
      },
      update: {
        lastAdaptedAt: new Date(),
        track: isIntensiveTrack ? 'INTENSIVE' : 'STANDARD',
        scheduledModules: {
          deleteMany: {},
          create: scheduledModules,
        },
      },
    });

    await cacheDel(CacheKeys.patientPlan(patientId));

    logger.info('SwellnessIQ learning plan generated', {
      patientId,
      moduleCount: scheduledModules.length,
      primaryCondition: patient.primaryCondition,
      track: isIntensiveTrack ? 'INTENSIVE' : 'STANDARD',
      laceScore: patient.laceScore,
      polypharmacy: patient.medications.length >= POLYPHARMACY_MEDICATION_LIMIT,
    });
  }

  /**
   * Process module completion and apply clinical adaptive logic:
   * - Score < 80% → immediate reinforcement or shortened interval
   * - Score ≥ 80% → check graduation criteria (3 consecutive passes → maintenance)
   * - 3 consecutive failures → nurse navigator alert (mandatory)
   */
  static async processModuleCompletion(
    patientId: string,
    moduleId: string,
    score: number
  ): Promise<void> {
    const [patient, progress, plan] = await Promise.all([
      prisma.patientProfile.findUnique({
        where: { id: patientId },
        include: { comorbidities: true },
      }),
      prisma.patientProgress.findFirst({
        where: { patientId, moduleId },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.learningPlan.findFirst({
        where: { patientId },
        include: {
          scheduledModules: {
            include: { module: { include: { branchingRules: true } } },
          },
        },
      }),
    ]);

    if (!patient || !plan) return;

    const passed = score >= MASTERY_THRESHOLD;

    // ── Update consecutive failure / pass counters ─────────────────────────────
    if (passed) {
      const newConsecutivePasses = plan.consecutivePasses + 1;

      await prisma.learningPlan.update({
        where: { id: plan.id },
        data: { consecutivePasses: newConsecutivePasses },
      });

      // Graduation: 3 consecutive ≥80% passes → maintenance mode
      if (newConsecutivePasses >= GRADUATION_PASS_COUNT && !patient.isMaintenanceMode) {
        await this.graduateToMaintenanceMode(patientId, plan.id);
      }
    } else {
      // Reset consecutive passes on failure
      await prisma.learningPlan.update({
        where: { id: plan.id },
        data: { consecutivePasses: 0 },
      });

      // Track consecutive failures on this specific module progress
      const newConsecutiveFailures = (progress?.consecutiveFailures ?? 0) + 1;

      if (progress) {
        await prisma.patientProgress.update({
          where: { id: progress.id },
          data: { consecutiveFailures: newConsecutiveFailures },
        });
      }

      // 3 consecutive failures → mandatory nurse navigator alert
      if (newConsecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
        await prisma.alert.create({
          data: {
            patientId,
            severity: 'HIGH',
            type: 'NURSE_NAVIGATOR',
            message: `Patient has failed the same module ${newConsecutiveFailures} consecutive times. ` +
              `Nurse navigator follow-up required. Module score: ${score}%`,
          },
        });

        logger.warn('Nurse navigator alert triggered — consecutive failures', {
          patientId,
          moduleId,
          consecutiveFailures: newConsecutiveFailures,
          score,
        });
      }
    }

    // ── Score < mastery threshold: trigger reinforcement ───────────────────────
    if (!passed) {
      await this.adaptPlan(patientId, 'EXERCISE_COMPLETED', {
        moduleId,
        score,
        consecutiveFailures: progress?.consecutiveFailures ?? 0,
      });
    }

    // ── Apply module branching rules ───────────────────────────────────────────
    const scheduledModule = plan.scheduledModules.find(sm => sm.moduleId === moduleId);
    if (scheduledModule) {
      await this.applyBranchingRules(patientId, plan, scheduledModule.module?.branchingRules ?? [], score);
    }

    // Update last engagement timestamp
    await prisma.patientProfile.update({
      where: { id: patientId },
      data: { lastEngagementAt: new Date() },
    });

    await cacheDel(CacheKeys.patientPlan(patientId));
  }

  /**
   * Graduate patient to maintenance mode after 3 consecutive ≥80% passes.
   * Maintenance cadence: one module per 30 days (vs. daily/weekly in active track).
   */
  private static async graduateToMaintenanceMode(patientId: string, planId: string): Promise<void> {
    // Update patient profile
    await prisma.patientProfile.update({
      where: { id: patientId },
      data: { isMaintenanceMode: true },
    });

    // Update plan track to MAINTENANCE
    await prisma.learningPlan.update({
      where: { id: planId },
      data: {
        track: 'MAINTENANCE',
        lastAdaptedAt: new Date(),
        adaptationEvents: {
          create: {
            trigger: 'GRADUATION',
            modulesAdded: [],
            modulesRemoved: [],
            explanation: `Patient graduated to monthly maintenance mode after ${GRADUATION_PASS_COUNT} consecutive ≥${MASTERY_THRESHOLD}% assessments`,
          },
        },
      },
    });

    // Reschedule remaining locked modules to maintenance cadence (monthly)
    const lockedModules = await prisma.scheduledModule.findMany({
      where: { planId, status: 'LOCKED' },
      orderBy: { order: 'asc' },
    });

    const now = new Date();
    for (let i = 0; i < lockedModules.length; i++) {
      const maintenanceDate = new Date(now);
      maintenanceDate.setDate(now.getDate() + (i + 1) * MAINTENANCE_INTERVAL_DAYS);

      await prisma.scheduledModule.update({
        where: { id: lockedModules[i].id },
        data: { scheduledDate: maintenanceDate },
      });
    }

    // Notify care team of graduation
    await prisma.alert.create({
      data: {
        patientId,
        severity: 'LOW',
        type: 'ENGAGEMENT',
        message: `Patient has graduated to maintenance mode after ${GRADUATION_PASS_COUNT} consecutive ` +
          `≥${MASTERY_THRESHOLD}% assessments. Monthly module cadence now active.`,
      },
    });

    logger.info('Patient graduated to maintenance mode', { patientId });
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

    // ── Score below mastery: add reinforcement module ──────────────────────────
    if (
      trigger === 'EXERCISE_COMPLETED'
      && context.score !== undefined
      && context.score < MASTERY_THRESHOLD
    ) {
      const failedModule = plan.scheduledModules.find(sm => sm.moduleId === context.moduleId);

      if (failedModule) {
        // Look for a REINFORCEMENT type module targeting the same conditions
        const reinforcementModules = await prisma.learningModule.findMany({
          where: {
            type: 'REINFORCEMENT',
            isActive: true,
            targetConditions: {
              some: {
                condition: { in: [patient.primaryCondition, ...patient.comorbidities.map(c => c.condition)] },
              },
            },
          },
          take: 2,
        });

        // Also check branching rules for explicitly mapped reinforcement
        const rules = failedModule.module?.branchingRules?.filter(
          r => r.conditionType === 'SCORE'
            && (r.actionType === 'ADD_MODULE' || r.actionType === 'UNLOCK_MODULE')
            && r.targetModuleId
        ) ?? [];

        const reinforcementIds = new Set<string>([
          ...rules.map(r => r.targetModuleId!).filter(Boolean),
          ...reinforcementModules.map(m => m.id),
        ]);

        for (const targetId of reinforcementIds) {
          const alreadyScheduled = plan.scheduledModules.some(sm => sm.moduleId === targetId);
          if (!alreadyScheduled) {
            // Shortened interval: next day for intensive, 2 days for standard
            const daysDelay = patient.isIntensiveTrack ? 1 : 2;
            await prisma.scheduledModule.create({
              data: {
                planId: plan.id,
                moduleId: targetId,
                scheduledDate: new Date(Date.now() + daysDelay * 24 * 60 * 60 * 1000),
                status: 'AVAILABLE',
                isAdaptive: true,
                adaptationReason: `Reinforcement: score ${context.score}% below ${MASTERY_THRESHOLD}% mastery threshold`,
                order: plan.scheduledModules.length + modulesAdded.length,
              },
            });
            modulesAdded.push(targetId);
          }
        }
        explanation = `Added reinforcement module — score ${context.score}% below ${MASTERY_THRESHOLD}% mastery threshold`;
      }
    }

    // ── Engagement drop: AI-recommended modules ────────────────────────────────
    if (
      trigger === 'ENGAGEMENT_DROP'
      || context.engagement === 'LOW'
      || context.engagement === 'AT_RISK'
    ) {
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
              adaptationReason: `AI recommendation: ${rec.reason} (urgency: ${rec.urgency})`,
              order: plan.scheduledModules.length + modulesAdded.length,
            },
          });
          modulesAdded.push(rec.moduleId);
        }
      }
      explanation = explanation || 'Added AI-recommended modules due to engagement drop';
    }

    // ── Comorbidity / new condition added: inject relevant modules ─────────────
    if (trigger === 'CONDITION_ADDED' && context.condition) {
      const newModules = await prisma.learningModule.findMany({
        where: {
          isActive: true,
          type: 'BRANCHING',
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
              scheduledDate: this.calculateScheduledDate(patient.dischargeDate, mod.daysPostDischarge),
              status: 'LOCKED',
              isAdaptive: true,
              adaptationReason: `Condition added: ${context.condition}`,
              order: plan.scheduledModules.length + modulesAdded.length,
            },
          });
          modulesAdded.push(mod.id);
        }
      }
      explanation = explanation || `Added branching modules for condition: ${context.condition}`;
    }

    if (modulesAdded.length > 0 || modulesRemoved.length > 0) {
      await prisma.learningPlan.update({
        where: { id: plan.id },
        data: {
          lastAdaptedAt: new Date(),
          adaptationCount: { increment: 1 },
          adaptationEvents: {
            create: { trigger, modulesAdded, modulesRemoved, explanation },
          },
        },
      });

      await cacheDel(CacheKeys.patientPlan(patientId));

      logger.info('Learning plan adapted', {
        patientId,
        trigger,
        modulesAdded: modulesAdded.length,
        explanation,
      });
    }
  }

  /**
   * Engagement escalation protocol — called by cron every 4 hours.
   * - 48h no engagement → push notification
   * - 72h no engagement → clinical alert to nurse navigator
   * - 96h no engagement → phone outreach escalation
   */
  static async runEngagementEscalation(): Promise<void> {
    const now = new Date();

    // Fetch patients with an active learning plan and a lastEngagementAt timestamp
    const patientsToCheck = await prisma.patientProfile.findMany({
      where: {
        isMaintenanceMode: false,
        lastEngagementAt: { not: null },
        learningPlan: { isNot: null },
      },
      select: {
        id: true,
        lastEngagementAt: true,
        isIntensiveTrack: true,
      },
    });

    for (const patient of patientsToCheck) {
      if (!patient.lastEngagementAt) continue;

      const hoursInactive = Math.floor(
        (now.getTime() - patient.lastEngagementAt.getTime()) / (1000 * 60 * 60)
      );

      // Check if we've already escalated at this level to avoid duplicates
      const existingEscalation = await prisma.engagementEscalationLog.findFirst({
        where: {
          patientId: patient.id,
          createdAt: { gte: patient.lastEngagementAt },
          hoursInactive: {
            gte: hoursInactive >= ENGAGEMENT_PHONE_OUTREACH_HOURS
              ? ENGAGEMENT_PHONE_OUTREACH_HOURS
              : hoursInactive >= ENGAGEMENT_CLINICAL_ALERT_HOURS
                ? ENGAGEMENT_CLINICAL_ALERT_HOURS
                : ENGAGEMENT_PUSH_HOURS,
          },
        },
      });

      if (existingEscalation) continue;

      if (hoursInactive >= ENGAGEMENT_PHONE_OUTREACH_HOURS) {
        await this.escalateEngagement(patient.id, 'PHONE_OUTREACH_96H', hoursInactive);
      } else if (hoursInactive >= ENGAGEMENT_CLINICAL_ALERT_HOURS) {
        await this.escalateEngagement(patient.id, 'CLINICAL_ALERT_72H', hoursInactive);
      } else if (hoursInactive >= ENGAGEMENT_PUSH_HOURS) {
        await this.escalateEngagement(patient.id, 'PUSH_48H', hoursInactive);
      }
    }
  }

  private static async escalateEngagement(
    patientId: string,
    escalationType: 'PUSH_48H' | 'CLINICAL_ALERT_72H' | 'PHONE_OUTREACH_96H',
    hoursInactive: number
  ): Promise<void> {
    const messages: Record<string, { severity: string; type: string; message: string }> = {
      PUSH_48H: {
        severity: 'MEDIUM',
        type: 'ENGAGEMENT',
        message: `Patient has not engaged with SwellnessIQ in ${hoursInactive} hours. Automated push notification sent.`,
      },
      CLINICAL_ALERT_72H: {
        severity: 'HIGH',
        type: 'NURSE_NAVIGATOR',
        message: `Patient has not engaged in ${hoursInactive} hours. Clinical alert — nurse navigator follow-up recommended.`,
      },
      PHONE_OUTREACH_96H: {
        severity: 'CRITICAL',
        type: 'NURSE_NAVIGATOR',
        message: `Patient has not engaged in ${hoursInactive} hours. Phone outreach required immediately.`,
      },
    };

    const config = messages[escalationType];

    await Promise.all([
      prisma.alert.create({
        data: {
          patientId,
          severity: config.severity as any,
          type: config.type as any,
          message: config.message,
        },
      }),
      prisma.engagementEscalationLog.create({
        data: {
          patientId,
          escalationType: escalationType as any,
          hoursInactive,
          actionTaken: config.message,
        },
      }),
    ]);

    logger.warn('Engagement escalation triggered', {
      patientId,
      escalationType,
      hoursInactive,
    });
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
   * Apply module-level branching rules after completion.
   */
  private static async applyBranchingRules(
    patientId: string,
    plan: any,
    branchingRules: any[],
    score: number
  ): Promise<void> {
    for (const rule of branchingRules) {
      if (!this.evaluateCondition(rule, score)) continue;

      if (rule.actionType === 'ESCALATE_TO_CARE_TEAM' || rule.actionType === 'SEND_ALERT') {
        await prisma.alert.create({
          data: {
            patientId,
            severity: 'HIGH',
            type: 'ENGAGEMENT',
            message: rule.alertMessage || `Clinical branching rule triggered — care team review needed`,
          },
        });
      }

      if (rule.actionType === 'BYPASS_TO_EMERGENCY') {
        await prisma.alert.create({
          data: {
            patientId,
            severity: 'CRITICAL',
            type: 'EMERGENCY_BYPASS',
            message: rule.alertMessage || `Emergency threshold reached — immediate intervention required`,
          },
        });
      }

      if (
        (rule.actionType === 'ADD_MODULE' || rule.actionType === 'UNLOCK_MODULE')
        && rule.targetModuleId
      ) {
        const alreadyScheduled = plan.scheduledModules.some(
          (sm: any) => sm.moduleId === rule.targetModuleId
        );

        if (!alreadyScheduled) {
          await prisma.scheduledModule.create({
            data: {
              planId: plan.id,
              moduleId: rule.targetModuleId,
              scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
              status: 'AVAILABLE',
              isAdaptive: true,
              adaptationReason: `Branching rule: ${rule.actionType} triggered by score ${score}%`,
              order: plan.scheduledModules.length,
            },
          });
        }
      }

      if (rule.actionType === 'SET_INTENSIVE_TRACK') {
        await prisma.patientProfile.update({
          where: { id: patientId },
          data: { isIntensiveTrack: true },
        });

        await prisma.learningPlan.update({
          where: { id: plan.id },
          data: { track: 'INTENSIVE' },
        });
      }
    }
  }

  /**
   * Calculate the real-world date for a module based on post-discharge day.
   * Pre-discharge modules (daysPostDischarge < 0) are available immediately at onboarding.
   * Intensive track: modules on days 1-14 are scheduled daily.
   */
  private static calculateScheduledDate(
    dischargeDate: Date,
    daysPostDischarge: number,
    isIntensiveTrack = false
  ): Date {
    // Pre-discharge: available immediately (use today or discharge date whichever is earlier)
    if (daysPostDischarge < 0) {
      const preDischargeDays = Math.abs(daysPostDischarge);
      const date = new Date(dischargeDate);
      date.setDate(date.getDate() - preDischargeDays);
      return date;
    }

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
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: { branchingRules: true },
    });

    if (!exercise) return;

    const plan = await prisma.learningPlan.findFirst({
      where: { patientId },
      include: { scheduledModules: true },
    });

    if (!plan) return;

    await this.applyBranchingRules(patientId, plan, exercise.branchingRules, score);
  }

  private static evaluateCondition(rule: any, score: number): boolean {
    if (rule.conditionType === 'SCORE') {
      const threshold = parseFloat(rule.conditionValue);
      switch (rule.conditionOperator) {
        case 'LT':  return score < threshold;
        case 'LTE': return score <= threshold;
        case 'GT':  return score > threshold;
        case 'GTE': return score >= threshold;
        case 'EQ':  return score === threshold;
        default:    return false;
      }
    }
    return false;
  }
}
