/**
 * SwellnessIQ Database Seed
 * Seeds the full 130-module clinical library across all 6 HRRP conditions
 * + Polypharmacy, Social Determinants, and Platform Fundamentals
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Module Library Definition ────────────────────────────────────────────────

interface ModuleDef {
  slug: string;
  title: string;
  description: string;
  type: 'CORE_CONDITION' | 'SELF_MONITORING' | 'BRANCHING' | 'POLYPHARMACY' | 'SOCIAL_DETERMINANTS' | 'REINFORCEMENT' | 'PLATFORM_FUNDAMENTALS';
  daysPostDischarge: number; // Negative = pre-discharge
  estimatedMinutes: number;
  isMandatory: boolean;
  conditions: { condition: string; isPrimary: boolean }[];
  exercises: number; // number of quiz questions
}

const MODULES: ModuleDef[] = [

  // ── Platform Fundamentals (3) ──────────────────────────────────────────────
  { slug: 'platform-how-it-works',   title: 'How SwellnessIQ Works',                    description: 'A quick tour of your recovery companion — what to expect and how to use it.',    type: 'PLATFORM_FUNDAMENTALS', daysPostDischarge: -1, estimatedMinutes: 3, isMandatory: true,  conditions: [], exercises: 0 },
  { slug: 'platform-accessibility',  title: 'Accessibility and Settings Setup',          description: 'Customize your experience — text size, captions, audio, and language settings.', type: 'PLATFORM_FUNDAMENTALS', daysPostDischarge: -1, estimatedMinutes: 2, isMandatory: false, conditions: [], exercises: 0 },
  { slug: 'platform-partnership',    title: 'Your Recovery Is a Partnership',            description: 'How SwellnessIQ, your care team, and you work together for the best outcome.',   type: 'PLATFORM_FUNDAMENTALS', daysPostDischarge: -1, estimatedMinutes: 3, isMandatory: true,  conditions: [], exercises: 0 },

  // ── Heart Failure — Core (10) ──────────────────────────────────────────────
  { slug: 'hf-what-is-hf',           title: 'What Is Heart Failure?',                   description: 'What heart failure means, why you were hospitalized, and what comes next.',       type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 3 },
  { slug: 'hf-medications',          title: 'Your Medications — Why Each One Matters',  description: 'Each of your heart failure medications explained: what it does and why it matters.',type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 3 },
  { slug: 'hf-daily-weigh-in',       title: 'Daily Weigh-In Protocol',                  description: 'Why weighing yourself every morning is your single most important daily task.',    type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },
  { slug: 'hf-salt-fluid',           title: 'Salt and Fluid Management',                description: 'Low-sodium eating and fluid limits — practical strategies for every meal.',        type: 'CORE_CONDITION',        daysPostDischarge: 2,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 3 },
  { slug: 'hf-activity-safety',      title: 'Activity and Exercise Safety',             description: 'How to safely increase your activity level during recovery.',                      type: 'CORE_CONDITION',        daysPostDischarge: 7,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },
  { slug: 'hf-warning-911',          title: 'Warning Signs — Immediate 911 Required',   description: 'Symptoms that mean call 911 right now — no waiting.',                             type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 3 },
  { slug: 'hf-warning-call-doctor',  title: 'Warning Signs — Call Your Doctor Today',   description: 'Symptoms that need your doctor's attention today, not tomorrow.',                  type: 'CORE_CONDITION',        daysPostDischarge: 3,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 3 },
  { slug: 'hf-daily-diary',          title: 'Managing Your Daily HF Diary',             description: 'How to track weight, symptoms, and how you feel every day.',                      type: 'CORE_CONDITION',        daysPostDischarge: 4,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },
  { slug: 'hf-emotional-health',     title: 'Emotional Health and HF',                  description: 'Depression and anxiety are common after heart failure — here is how to cope.',     type: 'CORE_CONDITION',        daysPostDischarge: 11, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },
  { slug: 'hf-followup-prep',        title: 'Preparing for Your 7-Day Follow-Up',       description: 'Questions to ask, what to bring, and what to expect at your first appointment.',   type: 'CORE_CONDITION',        daysPostDischarge: 4,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },

  // ── Heart Failure — Self-Monitoring (2) ───────────────────────────────────
  { slug: 'hf-weight-measurement',   title: 'Accurate Weight Measurement Protocol',     description: 'When, how, and what to do with your daily weight reading.',                       type: 'SELF_MONITORING',       daysPostDischarge: 2,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },
  { slug: 'hf-fluid-vs-weight',      title: 'Fluid Retention vs. Normal Weight Change', description: 'How to tell the difference between dangerous fluid buildup and normal variation.',  type: 'SELF_MONITORING',       daysPostDischarge: 5,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },

  // ── Heart Failure — Branching (6) ─────────────────────────────────────────
  { slug: 'hf-branch-ckd',           title: 'HF with CKD — Medication Monitoring',      description: 'Managing heart failure when you also have chronic kidney disease.',                type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: false }, { condition: 'CKD', isPrimary: false }], exercises: 3 },
  { slug: 'hf-branch-diabetes',      title: 'HF with Diabetes — SGLT2 Inhibitor Guide', description: 'How SGLT2 inhibitors help both your heart and blood sugar at the same time.',      type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: false }, { condition: 'DIABETES', isPrimary: false }], exercises: 3 },
  { slug: 'hf-branch-afib',          title: 'HF with Atrial Fibrillation — Anticoag',  description: 'Understanding your blood thinner and why it is non-negotiable.',                   type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: false }, { condition: 'ATRIAL_FIBRILLATION', isPrimary: false }], exercises: 3 },
  { slug: 'hf-branch-fatigue',       title: 'Managing HF Fatigue: Normal vs. Concerning',description: 'When fatigue is part of recovery and when it means something is wrong.',           type: 'BRANCHING',             daysPostDischarge: 9,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },
  { slug: 'hf-branch-diuretic',      title: 'Flexible Diuretic Strategy',               description: 'How your water pill dose may change — and what to watch for.',                     type: 'BRANCHING',             daysPostDischarge: 10, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },
  { slug: 'hf-branch-alcohol',       title: 'Alcohol, Caffeine, and HF: The Evidence',  description: 'The research on alcohol and caffeine and what it means for your heart.',           type: 'BRANCHING',             daysPostDischarge: 12, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },

  // ── Heart Failure — New v2.0 (2) ──────────────────────────────────────────
  { slug: 'hf-v2-sepsis',            title: 'Recognizing Sepsis: Signs That Require 911',description: 'Infection can become life-threatening fast — know these signs.',                   type: 'CORE_CONDITION',        daysPostDischarge: 5,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 3 },
  { slug: 'hf-v2-anemia',            title: 'Anemia After Hospitalization — Fatigue',   description: 'Why you feel so tired and what anemia has to do with it.',                         type: 'BRANCHING',             daysPostDischarge: 9,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'HEART_FAILURE', isPrimary: true }],  exercises: 2 },

  // ── COPD — Core (11) ─────────────────────────────────────────────────────
  { slug: 'copd-what-is-copd',       title: 'What Is COPD?',                            description: 'Understanding what COPD is and how it affects your lungs and daily life.',          type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 3 },
  { slug: 'copd-inhalers-which',     title: 'Your Inhalers — Which One Does What',      description: 'The difference between rescue and maintenance inhalers — and when to use each.',    type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 3 },
  { slug: 'copd-inhaler-technique',  title: 'Correct Inhaler Technique',                description: 'Step-by-step inhaler technique that makes the difference between working and not.', type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },
  { slug: 'copd-breathing',          title: 'Pursed-Lip and Diaphragmatic Breathing',   description: 'Two breathing techniques that reduce shortness of breath right now.',               type: 'CORE_CONDITION',        daysPostDischarge: 2,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },
  { slug: 'copd-exacerbation',       title: 'Recognizing an Exacerbation Early',        description: 'The early signs of a flare-up and what to do in the first 24 hours.',              type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 3 },
  { slug: 'copd-action-plan',        title: 'Your COPD Action Plan',                    description: 'Your personal green/yellow/red action plan — what to do at each level.',           type: 'CORE_CONDITION',        daysPostDischarge: 3,  estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 3 },
  { slug: 'copd-home-oxygen',        title: 'Home Oxygen Therapy — Safe and Correct Use',description: 'How to use home oxygen safely, including fire safety.',                             type: 'CORE_CONDITION',        daysPostDischarge: 4,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 3 },
  { slug: 'copd-smoking-cessation',  title: 'Smoking Cessation — The Most Effective Fix',description: 'Why quitting smoking is the #1 thing you can do for COPD — and how to start.',    type: 'CORE_CONDITION',        daysPostDischarge: 5,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },
  { slug: 'copd-pulm-rehab',         title: 'Pulmonary Rehabilitation — Why to Attend', description: 'What pulmonary rehab is, what to expect, and why it works.',                       type: 'CORE_CONDITION',        daysPostDischarge: 7,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },
  { slug: 'copd-nutrition',          title: 'Nutrition and COPD',                       description: 'How eating affects your breathing and what foods help your lungs.',                 type: 'CORE_CONDITION',        daysPostDischarge: 11, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },
  { slug: 'copd-activity-pacing',    title: 'Activity Pacing and Energy Conservation',  description: 'How to do more with less breathlessness using energy conservation techniques.',     type: 'CORE_CONDITION',        daysPostDischarge: 13, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },

  // ── COPD — Self-Monitoring (2) ───────────────────────────────────────────
  { slug: 'copd-cat-score',          title: 'Weekly CAT Score Monitoring',              description: 'How to complete the COPD Assessment Test and what your score means.',              type: 'SELF_MONITORING',       daysPostDischarge: 6,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },
  { slug: 'copd-pulse-ox',           title: 'Pulse Oximetry and Peak Flow Monitoring',  description: 'How to use your pulse oximeter and peak flow meter correctly.',                    type: 'SELF_MONITORING',       daysPostDischarge: 3,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },

  // ── COPD — Branching (5) ─────────────────────────────────────────────────
  { slug: 'copd-branch-hf',          title: 'COPD with Heart Failure — Managing Both',  description: 'Special considerations when you have both COPD and heart failure.',                type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: false }, { condition: 'HEART_FAILURE_COMORBID', isPrimary: false }], exercises: 3 },
  { slug: 'copd-branch-anxiety',     title: 'COPD with Anxiety and Panic Disorder',     description: 'Breaking the breathlessness-anxiety cycle — techniques that work.',                type: 'BRANCHING',             daysPostDischarge: 11, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: false }, { condition: 'ANXIETY_DEPRESSION', isPrimary: false }], exercises: 2 },
  { slug: 'copd-branch-air-quality', title: 'Air Quality and Environmental Triggers',   description: 'How to check air quality and protect your lungs on bad days.',                     type: 'BRANCHING',             daysPostDischarge: 10, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },
  { slug: 'copd-branch-vaccines',    title: 'Annual Vaccination Compliance',            description: 'Which vaccines protect COPD patients and when to get them.',                       type: 'BRANCHING',             daysPostDischarge: 14, estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },
  { slug: 'copd-branch-travel',      title: 'Travel and COPD — Altitude and Air Travel',description: 'How to travel safely with COPD, including flying with oxygen.',                    type: 'BRANCHING',             daysPostDischarge: 20, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 2 },

  // ── COPD — New v2.0 (1) ───────────────────────────────────────────────────
  { slug: 'copd-v2-infection',       title: 'Respiratory Infection Warning Signs',      description: 'Act before a respiratory infection becomes a hospital stay.',                      type: 'CORE_CONDITION',        daysPostDischarge: 5,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'COPD', isPrimary: true }], exercises: 3 },

  // ── Acute MI — Core (11) ─────────────────────────────────────────────────
  { slug: 'ami-what-happened',       title: 'What Happened to My Heart?',               description: 'A clear explanation of what a heart attack is and what was done to treat it.',     type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 3 },
  { slug: 'ami-dapt',                title: 'Dual Antiplatelet Therapy — Non-Negotiable',description: 'Why stopping your blood thinners can be fatal — and how to stay on track.',        type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 3 },
  { slug: 'ami-medications',         title: 'Your Cardiac Medications — Complete List', description: 'Every medication you were sent home with and exactly why you need it.',             type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 3 },
  { slug: 'ami-activity',            title: 'Activity Restrictions After Heart Attack',  description: 'What you can and cannot do in the first weeks, with a clear timeline.',           type: 'CORE_CONDITION',        daysPostDischarge: 2,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },
  { slug: 'ami-cardiac-rehab',       title: 'Cardiac Rehabilitation — Why to Attend',   description: 'The evidence for cardiac rehab and how to get started.',                           type: 'CORE_CONDITION',        daysPostDischarge: 5,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },
  { slug: 'ami-angina-vs-attack',    title: 'Angina vs. Heart Attack — Know the Difference',description: 'How to tell chest pain that can wait from chest pain that cannot.',            type: 'CORE_CONDITION',        daysPostDischarge: 3,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 3 },
  { slug: 'ami-warning-911',         title: 'Warning Signs — Call 911 Immediately',     description: 'These symptoms mean call 911 now. No waiting. No driving yourself.',               type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 3 },
  { slug: 'ami-bp-cholesterol',      title: 'Blood Pressure and Cholesterol Management',description: 'Your target numbers and what to do if you cannot reach them.',                     type: 'CORE_CONDITION',        daysPostDischarge: 7,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },
  { slug: 'ami-diet',                title: 'Heart-Healthy Diet After a Heart Attack',   description: 'The Mediterranean approach to eating after a heart attack.',                       type: 'CORE_CONDITION',        daysPostDischarge: 9,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },
  { slug: 'ami-smoking',             title: 'Smoking Cessation — Immediate and Non-Negotiable',description: 'The single most powerful thing you can do after a heart attack.',            type: 'CORE_CONDITION',        daysPostDischarge: 3,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },
  { slug: 'ami-depression',          title: 'Anxiety and Depression After a Heart Attack',description: 'Up to 25% of heart attack patients experience depression — here is help.',        type: 'CORE_CONDITION',        daysPostDischarge: 12, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },

  // ── Acute MI — Self-Monitoring (2) ───────────────────────────────────────
  { slug: 'ami-bp-monitoring',       title: 'Home Blood Pressure Monitoring Protocol',  description: 'When to check, how to check, and what numbers to report.',                        type: 'SELF_MONITORING',       daysPostDischarge: 4,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },
  { slug: 'ami-access-site',         title: 'Catheter Access Site Care',                description: 'How to care for your catheter site and what signs of infection look like.',        type: 'SELF_MONITORING',       daysPostDischarge: 2,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },

  // ── Acute MI — Branching (5) ─────────────────────────────────────────────
  { slug: 'ami-branch-diabetes',     title: 'Post-MI with Diabetes — Glucose Control',  description: 'Managing blood sugar after a heart attack — tighter targets and new risks.',       type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: false }, { condition: 'DIABETES', isPrimary: false }], exercises: 3 },
  { slug: 'ami-branch-hf',           title: 'Post-MI with Heart Failure — Combined Mgmt',description: 'When your heart attack has led to heart failure — what is different.',             type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: false }, { condition: 'HEART_FAILURE_COMORBID', isPrimary: false }], exercises: 3 },
  { slug: 'ami-branch-statin',       title: 'Statin Therapy — Even If Cholesterol Seems Normal',description: 'Why you need a statin even if your cholesterol looked fine before.',        type: 'BRANCHING',             daysPostDischarge: 10, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },
  { slug: 'ami-branch-nitro',        title: 'Nitroglycerin Protocol',                   description: 'How and when to use nitroglycerin — the 3-dose rule.',                             type: 'BRANCHING',             daysPostDischarge: 5,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 3 },
  { slug: 'ami-branch-return-work',  title: 'Return to Work After Heart Attack',         description: 'Guidelines on when and how to return to work depending on your job type.',         type: 'BRANCHING',             daysPostDischarge: 14, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'ACUTE_MI', isPrimary: true }], exercises: 2 },

  // ── CABG — Core (12) ─────────────────────────────────────────────────────
  { slug: 'cabg-what-was-done',      title: 'What Was Done in Your Surgery?',           description: 'A clear explanation of bypass surgery and what your new circulation looks like.',  type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 3 },
  { slug: 'cabg-sternal-precautions',title: 'Sternal Precautions — Protecting Your Sternum',description: 'The lifting, pulling, and pushing rules that protect your healing sternum.',   type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 3 },
  { slug: 'cabg-pain-management',    title: 'Pain Management After Cardiac Surgery',    description: 'Managing incision pain, muscle soreness, and when pain is a warning sign.',       type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },
  { slug: 'cabg-wound-care',         title: 'Wound Care — Sternal and Harvest Sites',   description: 'Daily wound care for your chest incision and leg harvest sites.',                  type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 3 },
  { slug: 'cabg-medications',        title: 'Your Cardiac Medications Post-CABG',       description: 'Which medications matter most after bypass surgery and why.',                      type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 3 },
  { slug: 'cabg-activity',           title: 'Activity Progression After Surgery',       description: 'Week-by-week activity guide — from walking to driving to returning to life.',      type: 'CORE_CONDITION',        daysPostDischarge: 5,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },
  { slug: 'cabg-warning-911',        title: 'Warning Signs — Call 911 Immediately',     description: 'Signs that your chest, heart, or leg needs immediate emergency attention.',        type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 3 },
  { slug: 'cabg-warning-surgeon',    title: 'Warning Signs — Call Your Surgeon Today',  description: 'Symptoms that need your surgeon today, not the ER — but soon.',                   type: 'CORE_CONDITION',        daysPostDischarge: 3,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 3 },
  { slug: 'cabg-cardiac-rehab',      title: 'Cardiac Rehabilitation — CABG Patients',  description: 'Why CABG patients benefit most from cardiac rehab — and how to get started.',     type: 'CORE_CONDITION',        daysPostDischarge: 7,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },
  { slug: 'cabg-diet',               title: 'Heart-Healthy Diet After CABG',            description: 'Eating to support your heart and your healing after bypass surgery.',               type: 'CORE_CONDITION',        daysPostDischarge: 9,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },
  { slug: 'cabg-emotional-recovery', title: 'Emotional Recovery After Open-Heart Surgery',description: 'Why emotional recovery is as important as physical recovery.',                   type: 'CORE_CONDITION',        daysPostDischarge: 11, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },
  { slug: 'cabg-sleep',              title: 'Sleep Disruption and Recovery',             description: 'Why sleep is disrupted after surgery and how to improve it.',                      type: 'CORE_CONDITION',        daysPostDischarge: 13, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },

  // ── CABG — Self-Monitoring (2) ───────────────────────────────────────────
  { slug: 'cabg-vital-monitoring',   title: 'Daily Vital Signs Monitoring Post-CABG',   description: 'Temperature, heart rate, blood pressure — what to check and when to call.',       type: 'SELF_MONITORING',       daysPostDischarge: 2,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },
  { slug: 'cabg-leg-monitoring',     title: 'Leg Harvest Site Monitoring',              description: 'Signs of infection, healing progress, and when to call your surgeon.',             type: 'SELF_MONITORING',       daysPostDischarge: 3,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },

  // ── CABG — Branching (5) ─────────────────────────────────────────────────
  { slug: 'cabg-branch-afib',        title: 'Post-CABG Atrial Fibrillation',            description: 'Post-surgical Afib is common — here is what to know and do.',                     type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: false }, { condition: 'ATRIAL_FIBRILLATION', isPrimary: false }], exercises: 3 },
  { slug: 'cabg-branch-diabetes',    title: 'CABG with Diabetes — Glucose and Healing', description: 'Why tight glucose control is critical for your incision to heal properly.',        type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: false }, { condition: 'DIABETES', isPrimary: false }], exercises: 3 },
  { slug: 'cabg-branch-ckd',         title: 'CABG with CKD — Fluid and Medication Adj', description: 'Adjustments needed when your kidneys are also under stress after surgery.',        type: 'BRANCHING',             daysPostDischarge: 9,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: false }, { condition: 'CKD', isPrimary: false }], exercises: 2 },
  { slug: 'cabg-branch-incisions',   title: 'Managing Multiple Incisions',              description: 'When you have both chest and leg incisions — coordinating your wound care.',       type: 'BRANCHING',             daysPostDischarge: 4,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },
  { slug: 'cabg-branch-return-work', title: 'Return to Work After CABG',                description: 'When you can return to work — and what restrictions apply by job type.',           type: 'BRANCHING',             daysPostDischarge: 20, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },

  // ── CABG — New v2.0 (2) ───────────────────────────────────────────────────
  { slug: 'cabg-v2-sternal-infection',title: 'Sternal Wound Infection — The Emergency', description: 'Signs of deep sternal infection that require immediate medical attention.',         type: 'CORE_CONDITION',        daysPostDischarge: 4,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 3 },
  { slug: 'cabg-v2-mobility',         title: 'Post-Operative Mobility — Get Moving Safely',description: 'Why early, careful movement speeds your recovery after bypass surgery.',         type: 'CORE_CONDITION',        daysPostDischarge: 6,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'CABG', isPrimary: true }], exercises: 2 },

  // ── THA/TKA — Core (10) ─────────────────────────────────────────────────
  { slug: 'tka-what-was-done',        title: 'Your New Joint — What to Expect',         description: 'What was replaced, what the new joint feels like, and the recovery ahead.',        type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },
  { slug: 'tka-hip-precautions',      title: 'Hip Precautions — Rules That Protect You',description: 'The bending, crossing, and twisting rules that protect your new hip.',              type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },
  { slug: 'tka-pain-management',      title: 'Pain Management After Joint Replacement', description: 'Managing pain while avoiding opioid dependence — a balanced approach.',             type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 2 },
  { slug: 'tka-blood-clot',           title: 'Blood Clot Prevention — Why and How',     description: 'DVT is the #1 complication — how your blood thinner and movement prevent it.',     type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },
  { slug: 'tka-wound-care',           title: 'Wound Care and Dressing Instructions',    description: 'Daily wound care protocol — when to change dressings and what to watch for.',      type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },
  { slug: 'tka-walking-aid',          title: 'Using Your Walking Aid Safely',            description: 'Correct technique for walkers and crutches — and how to navigate stairs.',         type: 'CORE_CONDITION',        daysPostDischarge: 2,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 2 },
  { slug: 'tka-physical-therapy',     title: 'Daily PT Exercises — Cannot Be Skipped',  description: 'Your home exercise program — why every session matters for your recovery.',        type: 'CORE_CONDITION',        daysPostDischarge: 2,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },
  { slug: 'tka-warning-911',          title: 'Warning Signs — Call 911 Immediately',    description: 'Pulmonary embolism and dislocation — signs that require emergency care now.',      type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },
  { slug: 'tka-warning-surgeon',      title: 'Warning Signs — Call Your Surgeon Today', description: 'Infection signs, increasing pain, and wound concerns that need same-day attention.',type: 'CORE_CONDITION',        daysPostDischarge: 3,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },
  { slug: 'tka-fall-prevention',      title: 'Home Safety — Fall Prevention',           description: 'Setting up your home to prevent falls — the leading cause of re-injury.',          type: 'CORE_CONDITION',        daysPostDischarge: 4,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 2 },

  // ── THA/TKA — Self-Monitoring (2) ───────────────────────────────────────
  { slug: 'tka-pain-functional',      title: 'Daily Pain Score and Functional Assessment',description: 'How to track your pain and function and when improvement should happen.',         type: 'SELF_MONITORING',       daysPostDischarge: 3,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 2 },
  { slug: 'tka-wound-monitoring',     title: 'Wound and Limb Monitoring Protocol',      description: 'Daily limb checks — color, temperature, swelling, and discharge.',                 type: 'SELF_MONITORING',       daysPostDischarge: 2,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 2 },

  // ── THA/TKA — Branching (4) ─────────────────────────────────────────────
  { slug: 'tka-branch-diabetes',      title: 'Arthroplasty with Diabetes — Wound Healing',description: 'Why glucose control is essential for your incision to heal properly.',           type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'THA_TKA', isPrimary: false }, { condition: 'DIABETES', isPrimary: false }], exercises: 3 },
  { slug: 'tka-branch-anticoag',      title: 'Anticoagulation — Warfarin vs. DOAC',     description: 'How your blood thinner works and what to watch for.',                              type: 'BRANCHING',             daysPostDischarge: 5,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },
  { slug: 'tka-branch-bilateral',     title: 'Bilateral Knee Replacement Recovery',     description: 'What makes bilateral replacement different — and more demanding.',                 type: 'BRANCHING',             daysPostDischarge: 6,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 2 },
  { slug: 'tka-branch-revision',      title: 'Revision Arthroplasty — Higher-Risk Recovery',description: 'The additional risks and precautions that come with revision surgery.',         type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 2 },

  // ── THA/TKA — New v2.0 (2) ───────────────────────────────────────────────
  { slug: 'tka-v2-pji',               title: 'Prosthetic Joint Infection — Cannot Wait', description: 'The signs of a joint infection that require immediate evaluation.',                type: 'CORE_CONDITION',        daysPostDischarge: 5,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },
  { slug: 'tka-v2-dvt-pe',            title: 'DVT and Pulmonary Embolism — Recognize It',description: 'Blood clots in the leg and lung — what they feel like and what to do.',           type: 'CORE_CONDITION',        daysPostDischarge: 3,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'THA_TKA', isPrimary: true }], exercises: 3 },

  // ── Pneumonia — Core (8) ─────────────────────────────────────────────────
  { slug: 'pna-what-is-it',           title: 'What Is Pneumonia and What Caused Yours?', description: 'Understanding your diagnosis — the type of pneumonia and how it was treated.',     type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 3 },
  { slug: 'pna-antibiotics',          title: 'Completing Your Antibiotic Course',        description: 'Why finishing every dose matters — and what happens if you stop early.',          type: 'CORE_CONDITION',        daysPostDischarge: -1, estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 3 },
  { slug: 'pna-recovery-timeline',    title: 'Your Recovery Timeline — What Is Normal?', description: 'Week-by-week guide to what recovery looks like and feels like.',                   type: 'CORE_CONDITION',        daysPostDischarge: 2,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },
  { slug: 'pna-warning-signs',        title: 'Warning Signs — Worsening Pneumonia',      description: 'Signs that your pneumonia is getting worse — and what to do right now.',           type: 'CORE_CONDITION',        daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 3 },
  { slug: 'pna-hydration',            title: 'Hydration and Nutrition in Recovery',      description: 'What to eat and drink during pneumonia recovery — and what to avoid.',             type: 'CORE_CONDITION',        daysPostDischarge: 3,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },
  { slug: 'pna-breathing-exercises',  title: 'Deep Breathing and Incentive Spirometry',  description: 'How to use your incentive spirometer and why breathing exercises prevent relapse.', type: 'CORE_CONDITION',        daysPostDischarge: 2,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },
  { slug: 'pna-vaccination',          title: 'Vaccination — Preventing the Next Pneumonia',description: 'Which vaccines protect you and when to get them after recovery.',                type: 'CORE_CONDITION',        daysPostDischarge: 7,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },
  { slug: 'pna-activity',             title: 'Returning to Activity — A Gradual Approach',description: 'How to safely increase activity during pneumonia recovery.',                      type: 'CORE_CONDITION',        daysPostDischarge: 10, estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },

  // ── Pneumonia — Self-Monitoring (1) ──────────────────────────────────────
  { slug: 'pna-vital-monitoring',     title: 'Monitoring Temperature, SpO2, and Breathing',description: 'What to check and what numbers should trigger a call to your doctor.',          type: 'SELF_MONITORING',       daysPostDischarge: 2,  estimatedMinutes: 2, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },

  // ── Pneumonia — Branching (4) ────────────────────────────────────────────
  { slug: 'pna-branch-copd',          title: 'Pneumonia with COPD — Avoiding Double Hit', description: 'Managing pneumonia recovery when your lungs are already compromised.',             type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: false }, { condition: 'COPD', isPrimary: false }], exercises: 3 },
  { slug: 'pna-branch-hf',            title: 'Pneumonia with Heart Failure — Fluid Priority',description: 'Balancing hydration and fluid restriction when you have both conditions.',      type: 'BRANCHING',             daysPostDischarge: 8,  estimatedMinutes: 4, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: false }, { condition: 'HEART_FAILURE_COMORBID', isPrimary: false }], exercises: 3 },
  { slug: 'pna-branch-aspiration',    title: 'Aspiration Pneumonia — Prevention Is Ongoing',description: 'How aspiration pneumonia happens and how to prevent a repeat episode.',          type: 'BRANCHING',             daysPostDischarge: 9,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },
  { slug: 'pna-branch-immunocomp',    title: 'Immunocompromised Patients — Heightened Watch',description: 'Extra precautions for patients on immunosuppressive therapy.',                  type: 'BRANCHING',             daysPostDischarge: 9,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },

  // ── Pneumonia — New v2.0 (3) ─────────────────────────────────────────────
  { slug: 'pna-v2-sepsis',            title: 'Sepsis — The Complication After Pneumonia', description: 'How pneumonia can become sepsis — and the signs that mean 911 right now.',        type: 'CORE_CONDITION',        daysPostDischarge: 4,  estimatedMinutes: 3, isMandatory: true,  conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 3 },
  { slug: 'pna-v2-mobility',          title: 'Rebuilding Strength After Pneumonia',       description: 'Why mobility matters during recovery — and how to start safely.',                  type: 'CORE_CONDITION',        daysPostDischarge: 6,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },
  { slug: 'pna-v2-secondary',         title: 'Preventing Secondary Infections',           description: 'How to protect yourself from another infection while your immune system recovers.', type: 'CORE_CONDITION',        daysPostDischarge: 7,  estimatedMinutes: 3, isMandatory: false, conditions: [{ condition: 'PNEUMONIA', isPrimary: true }], exercises: 2 },

  // ── Polypharmacy — Cross-Condition (10) ──────────────────────────────────
  { slug: 'poly-complete-list',       title: 'Your Complete Medication List — Why It Matters',description: 'Why every provider needs to see every medication you take.',                  type: 'POLYPHARMACY',          daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [], exercises: 3 },
  { slug: 'poly-drug-interactions',   title: 'Drug Interactions — What Conflicts Look Like',description: 'How to spot a drug interaction and what to do about it.',                       type: 'POLYPHARMACY',          daysPostDischarge: 3,  estimatedMinutes: 4, isMandatory: false, conditions: [], exercises: 3 },
  { slug: 'poly-schedule',            title: 'Medication Schedule by Time of Day',        description: 'Building a simple, consistent medication schedule that works for your life.',      type: 'POLYPHARMACY',          daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: false, conditions: [], exercises: 2 },
  { slug: 'poly-missed-dose',         title: 'If You Miss a Dose — What to Do',           description: 'The rules for missed doses — which to take late and which to skip.',              type: 'POLYPHARMACY',          daysPostDischarge: 5,  estimatedMinutes: 3, isMandatory: false, conditions: [], exercises: 3 },
  { slug: 'poly-otc-supplements',     title: 'OTC and Supplement Interactions',            description: 'Common supplements and OTC drugs that conflict with prescription medications.',   type: 'POLYPHARMACY',          daysPostDischarge: 7,  estimatedMinutes: 4, isMandatory: false, conditions: [], exercises: 3 },
  { slug: 'poly-side-effects',        title: 'Side Effects — Expected vs. Concerning',    description: 'Which side effects are normal and which require a call to your doctor.',          type: 'POLYPHARMACY',          daysPostDischarge: 4,  estimatedMinutes: 3, isMandatory: false, conditions: [], exercises: 3 },
  { slug: 'poly-multiple-providers',  title: 'Managing Medications Across Providers',     description: 'How to prevent dangerous prescribing gaps when you see multiple doctors.',        type: 'POLYPHARMACY',          daysPostDischarge: 10, estimatedMinutes: 3, isMandatory: false, conditions: [], exercises: 2 },
  { slug: 'poly-adherence-tools',     title: 'Adherence Tools',                           description: 'Pill organizers, apps, and reminders that actually improve medication adherence.', type: 'POLYPHARMACY',          daysPostDischarge: 6,  estimatedMinutes: 3, isMandatory: false, conditions: [], exercises: 2 },
  { slug: 'poly-v2-reconciliation',   title: 'Medication Reconciliation at Discharge',    description: 'The most important moment: verifying your discharge medication list is correct.',  type: 'POLYPHARMACY',          daysPostDischarge: -1, estimatedMinutes: 4, isMandatory: true,  conditions: [], exercises: 3 },
  { slug: 'poly-v2-left-ama',         title: 'If You Left Before Care Was Complete',      description: 'What to do immediately if you left the hospital before your care was finished.',   type: 'POLYPHARMACY',          daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: false, conditions: [], exercises: 2 },

  // ── Social Determinants & Care Coordination (5) ───────────────────────────
  { slug: 'sdoh-followup-appointment',title: 'Schedule Your Follow-Up Appointment Today',description: 'How to book your 7-day follow-up today — including telehealth options.',          type: 'SOCIAL_DETERMINANTS',   daysPostDischarge: 1,  estimatedMinutes: 2, isMandatory: true,  conditions: [], exercises: 2 },
  { slug: 'sdoh-transportation',      title: 'Transportation to Your Appointment',        description: 'Free and low-cost transportation resources available to you.',                    type: 'SOCIAL_DETERMINANTS',   daysPostDischarge: 2,  estimatedMinutes: 2, isMandatory: false, conditions: [], exercises: 0 },
  { slug: 'sdoh-discharge-summary',   title: 'Understanding Your Discharge Summary',      description: 'What each part of your discharge paperwork means in plain language.',              type: 'SOCIAL_DETERMINANTS',   daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [], exercises: 2 },
  { slug: 'sdoh-support-network',     title: 'Building Your Recovery Support Network',   description: 'How family, friends, and community resources support better recovery outcomes.',   type: 'SOCIAL_DETERMINANTS',   daysPostDischarge: 3,  estimatedMinutes: 2, isMandatory: false, conditions: [], exercises: 0 },
  { slug: 'sdoh-call-911-vs-doctor',  title: '911 vs. Call Your Provider vs. Wait',       description: 'A decision guide for every symptom scenario — know what to do and when.',          type: 'SOCIAL_DETERMINANTS',   daysPostDischarge: 1,  estimatedMinutes: 3, isMandatory: true,  conditions: [], exercises: 3 },
];

// ─── Seed Function ────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding SwellnessIQ database — ${MODULES.length} modules...`);

  // ── Admin user ─────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@swellnessiq.com' },
    update: {},
    create: {
      email: 'admin@swellnessiq.com',
      passwordHash: await bcrypt.hash('Admin123!', 12),
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  // ── Facility ───────────────────────────────────────────────────────────────
  const facility = await prisma.facility.upsert({
    where: { npi: '1234567890' },
    update: {},
    create: {
      name: 'Memorial General Hospital',
      npi: '1234567890',
      city: 'Nashville',
      state: 'TN',
      fhirBaseUrl: 'https://fhir.memorialgeneral.org/r4',
    },
  });

  // ── Care team ──────────────────────────────────────────────────────────────
  const careTeam = await prisma.careTeam.upsert({
    where: { id: 'seed-care-team' },
    update: {},
    create: {
      id: 'seed-care-team',
      name: 'Heart Failure Transition Team',
      facilityId: facility.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'navigator@swellnessiq.com' },
    update: {},
    create: {
      email: 'navigator@swellnessiq.com',
      passwordHash: await bcrypt.hash('Nurse123!', 12),
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'CARE_COORDINATOR',
      isEmailVerified: true,
      careTeamMember: {
        create: { careTeamId: careTeam.id, title: 'Nurse Navigator, RN', specialty: 'Cardiology' },
      },
    },
  });

  // ── Sample patient (HF + Diabetes + CKD — triggers intensive track) ────────
  await prisma.user.upsert({
    where: { email: 'patient@swellnessiq.com' },
    update: {},
    create: {
      email: 'patient@swellnessiq.com',
      passwordHash: await bcrypt.hash('Patient123!', 12),
      firstName: 'Robert',
      lastName: 'Martinez',
      role: 'PATIENT',
      isEmailVerified: true,
      phone: '+1-615-555-0100',
      patient: {
        create: {
          dischargeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          primaryCondition: 'HEART_FAILURE',
          laceScore: 12, // ≥10 → intensive track
          isIntensiveTrack: true,
          engagementLevel: 'MEDIUM',
          preferredLanguage: 'en',
          dateOfBirth: new Date('1950-06-15'),
          gender: 'Male',
          zipCode: '37201',
          insuranceType: 'Medicare',
          facilityId: facility.id,
          careTeamId: careTeam.id,
          comorbidities: {
            create: [
              { condition: 'DIABETES', isPrimary: false },
              { condition: 'CKD', isPrimary: false },
              { condition: 'HYPERTENSION', isPrimary: false },
            ],
          },
          medications: {
            create: [
              { name: 'Carvedilol',   dosage: '25mg',   frequency: 'Twice daily',  instructions: 'Take with food',              startDate: new Date() },
              { name: 'Lisinopril',   dosage: '10mg',   frequency: 'Once daily',   instructions: 'Take in the morning',         startDate: new Date() },
              { name: 'Furosemide',   dosage: '40mg',   frequency: 'Once daily',   instructions: 'Take in the morning',         startDate: new Date() },
              { name: 'Spironolactone',dosage: '25mg',  frequency: 'Once daily',   instructions: 'Take with food',              startDate: new Date() },
              { name: 'Empagliflozin',dosage: '10mg',   frequency: 'Once daily',   instructions: 'Take in the morning',         startDate: new Date() },
              { name: 'Metformin',    dosage: '500mg',  frequency: 'Twice daily',  instructions: 'Take with meals',             startDate: new Date() },
            ],
          },
          accessibilityConfig: {
            create: { largeText: true, captionsEnabled: true, preferredMediaType: 'VIDEO' },
          },
        },
      },
    },
  });

  // ── Seed all 130 modules ───────────────────────────────────────────────────
  let created = 0;
  for (const mod of MODULES) {
    await prisma.learningModule.upsert({
      where: { slug: mod.slug },
      update: { title: mod.title, description: mod.description },
      create: {
        slug: mod.slug,
        title: mod.title,
        description: mod.description,
        type: mod.type as any,
        daysPostDischarge: mod.daysPostDischarge,
        estimatedMinutes: mod.estimatedMinutes,
        isMandatory: mod.isMandatory,
        masteryThreshold: 80,
        consecutiveFailureLimit: 3,
        targetConditions: {
          create: mod.conditions.map(c => ({ condition: c.condition as any, isPrimary: c.isPrimary })),
        },
        contentBlocks: {
          create: [
            {
              order: 1,
              phase: 'HOOK',
              type: 'VIDEO',
              title: `Introduction — ${mod.title}`,
              content: `https://cdn.swellnessiq.com/modules/${mod.slug}/hook.mp4`,
              durationSeconds: 30,
              transcript: `This lesson covers: ${mod.description}`,
            },
            {
              order: 2,
              phase: 'CORE',
              type: 'VIDEO',
              title: mod.title,
              content: `https://cdn.swellnessiq.com/modules/${mod.slug}/core.mp4`,
              durationSeconds: mod.type === 'REINFORCEMENT' ? 90 : (mod.estimatedMinutes - 1) * 60,
              transcript: `Core content for ${mod.title}`,
            },
            {
              order: 3,
              phase: 'APPLICATION',
              type: 'TEXT',
              title: 'What This Means for You',
              content: `## What to Do Next\n\nBased on what you just learned about ${mod.title.toLowerCase()}, here are your action steps:\n\n- Review what you learned with a family member or caregiver\n- Ask your care team if you have questions\n- If you experience any warning signs, contact your care team or call 911`,
              durationSeconds: 30,
            },
          ],
        },
        exercises: mod.exercises > 0 ? {
          create: Array.from({ length: mod.exercises }, (_, i) => ({
            order: i + 1,
            type: 'QUIZ',
            prompt: `Knowledge check ${i + 1}: Based on "${mod.title}", which of the following is correct?`,
            masteryThreshold: 80,
            maxScore: 100,
            failureAction: 'IMMEDIATE_REINFORCEMENT',
            consecutiveFailureLimit: 3,
            options: {
              create: [
                { text: 'The correct answer based on this module', value: 'a', isCorrect: true,  feedback: 'Correct! This is the key point from this lesson.' },
                { text: 'An incorrect but plausible answer',       value: 'b', isCorrect: false, feedback: 'Not quite — review the key points above and try again.' },
                { text: 'Another incorrect answer',                value: 'c', isCorrect: false, feedback: 'Not quite — review the key points above and try again.' },
              ],
            },
          })),
        } : undefined,
      },
    });
    created++;
    if (created % 20 === 0) console.log(`  ${created}/${MODULES.length} modules seeded...`);
  }

  console.log(`\n✓ ${created} modules seeded`);
  console.log('\nAccounts:');
  console.log('  Admin:     admin@swellnessiq.com     / Admin123!');
  console.log('  Navigator: navigator@swellnessiq.com / Nurse123!');
  console.log('  Patient:   patient@swellnessiq.com   / Patient123!');
  console.log('\nSeed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
