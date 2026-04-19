/**
 * AIRecommendationEngine — Claude-powered personalization and recommendations
 *
 * Uses Anthropic Claude API with prompt caching for:
 *  - Module recommendations based on patient profile
 *  - Content summarization and simplification
 *  - Risk scoring
 *  - Engagement nudges
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/database';
import { cacheGet, cacheSet } from '../lib/redis';
import { logger } from '../lib/logger';
import { AIRecommendation } from '@rastera/shared';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MASTERY_THRESHOLD = 80; // 80% — competency-based medical education standard

// System prompt with prompt caching (TTL: 1 hour on Anthropic's side)
const SYSTEM_PROMPT = `You are a clinical decision support AI embedded in SwellnessIQ, a post-discharge patient education platform designed to reduce 30-day hospital readmissions.

SwellnessIQ targets the 6 CMS HRRP (Hospital Readmissions Reduction Program) penalized conditions:
- Heart Failure (HF)
- COPD
- Acute Myocardial Infarction (AMI)
- CABG (Coronary Artery Bypass Graft)
- THA/TKA (Total Hip/Knee Replacement)
- Pneumonia

Clinical benchmark: Coleman Care Transitions Model (4.4 percentage point 30-day readmission reduction).
Mean readmission cost: $16,037 per episode. Reducing readmissions is the primary clinical and financial goal.

LACE+ Score context:
- ≥10 = Intensive Track: daily modules Days 1-14, required caregiver enrollment
- <10 = Standard Track: modules every 2-3 days

Mastery threshold: 80% (competency-based medical education standard)

Your role is to:
1. Recommend personalized learning modules based on patient clinical profiles and HRRP condition context
2. Assess patient engagement and suggest evidence-based interventions
3. Summarize medical content in patient-friendly language (6th-grade reading level by default, 4th-grade for SDOH-positive patients)
4. Identify patients at risk for readmission based on behavioral patterns, vital trends, and engagement signals
5. Support caregiver engagement for intensive-track patients

IMPORTANT GUIDELINES:
- You provide EDUCATIONAL guidance only, never diagnostic advice
- Always recommend patients contact their care team for clinical concerns
- Use plain language appropriate for patients with varying health literacy
- Consider the patient's primary HRRP condition AND comorbidities together (especially diabetes, CKD, A-fib, hypertension)
- Factor in social determinants (zip code, insurance type, housing stability) when available
- Prioritize mandatory non-skippable modules: medication reconciliation, warning signs, emergency thresholds, PCP follow-up
- For polypharmacy patients (≥5 discharge meds): prioritize medication management modules Days 3-5
- Spaced repetition: if patient scored <80% on a module, recommend reinforcement within 24-48h

Module types available:
- CORE_CONDITION: Primary HRRP diagnosis education (symptoms, management, warning signs)
- SELF_MONITORING: Vital signs, symptom tracking, daily weight checks
- BRANCHING: Comorbidity-specific content (diabetes+HF, CKD+meds, A-fib anticoagulation)
- POLYPHARMACY: Medication reconciliation, side effects, adherence (for ≥5 med patients)
- SOCIAL_DETERMINANTS: Food security, transportation, housing, mental health support
- REINFORCEMENT: Knowledge refresher for <80% quiz scores — shortened interval delivery
- PLATFORM_FUNDAMENTALS: Onboarding, app navigation, goal-setting

Always respond with valid JSON.`;

export class AIRecommendationEngine {

  /**
   * Get personalized module recommendations for a patient.
   * Cached per patient for 30 minutes.
   */
  static async getRecommendations(patientId: string): Promise<AIRecommendation[]> {
    const cacheKey = `ai:recommendations:${patientId}`;
    const cached = await cacheGet<AIRecommendation[]>(cacheKey);
    if (cached) return cached;

    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        comorbidities: true,
        medications: { where: { isActive: true } },
        progress: { include: { module: true }, orderBy: { updatedAt: 'desc' }, take: 10 },
        vitalLogs: { orderBy: { loggedAt: 'desc' }, take: 5 },
        symptomLogs: { orderBy: { loggedAt: 'desc' }, take: 5 },
      },
    });

    if (!patient) return [];

    // Fetch available modules not yet scheduled
    const scheduledModuleIds = await prisma.scheduledModule.findMany({
      where: { plan: { patientId } },
      select: { moduleId: true },
    }).then(r => r.map(s => s.moduleId));

    const availableModules = await prisma.learningModule.findMany({
      where: { isActive: true, id: { notIn: scheduledModuleIds } },
      select: { id: true, title: true, type: true, description: true, targetConditions: true },
    });

    const daysPostDischarge = Math.floor(
      (Date.now() - patient.dischargeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const patientContext = {
      primaryCondition: patient.primaryCondition,
      comorbidities: patient.comorbidities.map(c => c.condition),
      medicationCount: patient.medications.length,
      engagementLevel: patient.engagementLevel,
      daysPostDischarge,
      recentProgress: patient.progress.map(p => ({
        module: p.module.title,
        score: p.score,
        status: p.status,
      })),
      recentVitals: patient.vitalLogs.map(v => ({ type: v.type, value: v.value, isAbnormal: v.isAbnormal })),
      recentSymptoms: patient.symptomLogs.map(s => ({ symptom: s.symptom, severity: s.severity })),
      zipCode: patient.zipCode,
      insuranceType: patient.insuranceType,
    };

    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Given this patient profile, recommend the top 3 learning modules from the available list. Return a JSON array of recommendations.

Patient Profile:
${JSON.stringify(patientContext, null, 2)}

Available Modules:
${JSON.stringify(availableModules.slice(0, 20), null, 2)}

Return JSON array: [{ "moduleId": "...", "reason": "...", "confidenceScore": 0.0-1.0, "urgency": "LOW|MEDIUM|HIGH" }]`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const recommendations: AIRecommendation[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      await cacheSet(cacheKey, recommendations, 1800); // 30 min cache

      logger.info('AI recommendations generated', { patientId, count: recommendations.length });
      return recommendations;

    } catch (err) {
      logger.error('AI recommendation failed', { patientId, error: err });
      return [];
    }
  }

  /**
   * Compute a readmission risk score (0-100) using patient behavioral data.
   */
  static async computeRiskScore(patientId: string): Promise<number> {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        comorbidities: true,
        medications: { where: { isActive: true } },
        progress: { orderBy: { updatedAt: 'desc' }, take: 20 },
        vitalLogs: { orderBy: { loggedAt: 'desc' }, take: 10 },
        symptomLogs: { orderBy: { loggedAt: 'desc' }, take: 10 },
        alerts: { where: { isAcknowledged: false } },
      },
    });

    if (!patient) return 50;

    const daysPostDischarge = Math.floor(
      (Date.now() - patient.dischargeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const completedModules = patient.progress.filter(p => p.status === 'COMPLETED').length;
    const totalModules = patient.progress.length;
    const completionRate = totalModules > 0 ? completedModules / totalModules : 0;

    const avgScore = patient.progress
      .filter(p => p.score !== null)
      .reduce((sum, p) => sum + (p.score || 0), 0) / Math.max(1, patient.progress.filter(p => p.score !== null).length);

    const hasAbnormalVitals = patient.vitalLogs.some(v => v.isAbnormal);
    const highSeveritySymptoms = patient.symptomLogs.filter(s => s.severity >= 7).length;
    const criticalAlerts = patient.alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Calculate a 30-day hospital readmission risk score (0-100) for this HRRP patient.
Higher = more at risk. Apply Coleman Care Transitions Model weighting and HRRP condition-specific factors.

Data:
- Primary HRRP condition: ${patient.primaryCondition}
- Comorbidities: ${patient.comorbidities.map(c => c.condition).join(', ')}
- Medication count: ${patient.medications.length} (≥5 = polypharmacy flag)
- LACE+ score: ${(patient as any).laceScore ?? 'unknown'} (≥10 = intensive track)
- Days post-discharge: ${daysPostDischarge}
- Module completion rate: ${(completionRate * 100).toFixed(0)}%
- Average mastery score: ${avgScore.toFixed(0)}% (threshold: 80%)
- Engagement level: ${patient.engagementLevel}
- Abnormal vitals in last 5 readings: ${hasAbnormalVitals}
- High-severity symptoms (≥7/10) logged: ${highSeveritySymptoms}
- Unresolved critical/high alerts: ${criticalAlerts}
- Intensive track: ${(patient as any).isIntensiveTrack ?? false}

Return only JSON: { "riskScore": 0-100, "primaryFactors": ["factor1", "factor2"] }`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{"riskScore":50}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return 50;

      const result = JSON.parse(jsonMatch[0]);
      return Math.max(0, Math.min(100, result.riskScore || 50));

    } catch (err) {
      logger.error('Risk score computation failed', { patientId, error: err });
      // Fallback: rule-based scoring (HRRP-weighted)
      let score = 30;
      if (completionRate < 0.3) score += 20;
      if (avgScore < MASTERY_THRESHOLD) score += 15; // Below 80% mastery
      if (hasAbnormalVitals) score += 15;
      if (patient.engagementLevel === 'AT_RISK') score += 20;
      if (criticalAlerts > 0) score += 10;
      if ((patient as any).laceScore >= 10) score += 10; // LACE+ intensive-track patients
      if (patient.medications.length >= 5) score += 5;   // Polypharmacy
      return Math.min(100, score);
    }
  }

  /**
   * Simplify module content for a patient with specific accessibility needs.
   */
  static async simplifyContent(content: string, patientId: string): Promise<string> {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: { accessibilityConfig: true },
    });

    if (!patient?.accessibilityConfig?.simplifiedLanguage) return content;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Rewrite the following medical education content at a 6th-grade reading level.
Use short sentences, simple words, and bullet points. Keep all key health information intact.
Preferred language: ${patient.preferredLanguage || 'en'}

Content to simplify:
${content}

Return only the simplified content, no additional commentary.`,
          },
        ],
      });

      return response.content[0].type === 'text' ? response.content[0].text : content;
    } catch {
      return content;
    }
  }

  /**
   * Generate a behavioral nudge message for a patient with low engagement.
   */
  static async generateNudge(patientId: string): Promise<string> {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { firstName: true } },
        learningPlan: {
          include: {
            scheduledModules: {
              where: { status: 'AVAILABLE' },
              include: { module: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!patient) return "It's time for your next health lesson!";

    const nextModule = patient.learningPlan?.scheduledModules[0];

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', // Use Haiku for simple nudges (cheaper + faster)
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Write a warm, encouraging 1-2 sentence reminder for a patient recovering from ${patient.primaryCondition}.
Patient name: ${patient.user?.firstName || 'there'}
Next module: ${nextModule?.module.title || 'your next health lesson'}
Engagement: ${patient.engagementLevel}

Be positive, non-judgmental, and health-focused. Keep it under 160 characters for SMS.`,
          },
        ],
      });

      return response.content[0].type === 'text'
        ? response.content[0].text.trim()
        : "You're doing great! Your next health lesson is ready. Take 5 minutes for your wellbeing today.";
    } catch {
      return `Hi ${patient.user?.firstName || 'there'}! Your next module is ready. Learning about your health helps you recover faster.`;
    }
  }
}
