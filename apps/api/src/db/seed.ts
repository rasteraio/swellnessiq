/**
 * Database seed — creates sample data for development
 * Run: npm run db:seed --workspace=apps/api
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Admin user ─────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rastera.health' },
    update: {},
    create: {
      email: 'admin@rastera.health',
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
      address: '123 Medical Center Drive',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
      fhirBaseUrl: 'https://fhir.memorialgeneral.org/r4',
    },
  });

  // ── Care team ──────────────────────────────────────────────────────────────
  const careTeam = await prisma.careTeam.upsert({
    where: { id: 'seed-care-team' },
    update: {},
    create: {
      id: 'seed-care-team',
      name: 'Cardiology Care Team',
      facilityId: facility.id,
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@rastera.health' },
    update: {},
    create: {
      email: 'coordinator@rastera.health',
      passwordHash: await bcrypt.hash('Coord123!', 12),
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'CARE_COORDINATOR',
      isEmailVerified: true,
      careTeamMember: {
        create: {
          careTeamId: careTeam.id,
          title: 'RN, Care Coordinator',
          specialty: 'Cardiology',
        },
      },
    },
  });

  // ── Sample patient ─────────────────────────────────────────────────────────
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@rastera.health' },
    update: {},
    create: {
      email: 'patient@rastera.health',
      passwordHash: await bcrypt.hash('Patient123!', 12),
      firstName: 'Robert',
      lastName: 'Martinez',
      role: 'PATIENT',
      isEmailVerified: true,
      phone: '+1-617-555-0100',
      patient: {
        create: {
          dischargeDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          primaryCondition: 'HEART_FAILURE',
          engagementLevel: 'MEDIUM',
          preferredLanguage: 'en',
          dateOfBirth: new Date('1948-06-15'),
          gender: 'Male',
          zipCode: '02101',
          insuranceType: 'Medicare',
          facilityId: facility.id,
          careTeamId: careTeam.id,
          comorbidities: {
            create: [
              { condition: 'DIABETES', isPrimary: false },
              { condition: 'HYPERTENSION', isPrimary: false },
            ],
          },
          medications: {
            create: [
              { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', instructions: 'Take with water in the morning', startDate: new Date() },
              { name: 'Carvedilol', dosage: '25mg', frequency: 'Twice daily', instructions: 'Take with food', startDate: new Date() },
              { name: 'Furosemide', dosage: '40mg', frequency: 'Once daily', instructions: 'Take in the morning', startDate: new Date() },
              { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', instructions: 'Take with meals', startDate: new Date() },
              { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', instructions: 'Take with food', startDate: new Date() },
            ],
          },
          accessibilityConfig: {
            create: {
              largeText: true,
              captionsEnabled: true,
              simplifiedLanguage: false,
              preferredMediaType: 'VIDEO',
            },
          },
        },
      },
    },
  });

  // ── Learning modules ───────────────────────────────────────────────────────
  const modules = [
    {
      slug: 'hf-basics-day2',
      title: 'Understanding Heart Failure',
      description: 'Learn what heart failure means, why you were hospitalized, and how you can manage it at home.',
      type: 'CORE_CONDITION' as const,
      estimatedMinutes: 5,
      daysPostDischarge: 2,
      difficulty: 1,
      conditions: [{ condition: 'HEART_FAILURE' as const, isPrimary: true }],
    },
    {
      slug: 'hf-daily-weigh-day2',
      title: 'Daily Weight Monitoring',
      description: 'Why weighing yourself every day is crucial for heart failure management.',
      type: 'SELF_MONITORING' as const,
      estimatedMinutes: 5,
      daysPostDischarge: 2,
      difficulty: 1,
      conditions: [{ condition: 'HEART_FAILURE' as const, isPrimary: true }],
    },
    {
      slug: 'hf-medications-day5',
      title: 'Your Heart Failure Medications',
      description: 'Understanding each medication you take, why it matters, and how to take it correctly.',
      type: 'POLYPHARMACY' as const,
      estimatedMinutes: 7,
      daysPostDischarge: 5,
      difficulty: 2,
      conditions: [{ condition: 'HEART_FAILURE' as const, isPrimary: true }],
    },
    {
      slug: 'hf-symptoms-day5',
      title: 'Warning Signs to Watch For',
      description: 'Recognize early warning signs that mean you should call your doctor or go to the ER.',
      type: 'SELF_MONITORING' as const,
      estimatedMinutes: 5,
      daysPostDischarge: 5,
      difficulty: 1,
      conditions: [{ condition: 'HEART_FAILURE' as const, isPrimary: true }],
    },
    {
      slug: 'hf-diet-day7',
      title: 'Diet and Fluid Management',
      description: 'Low-sodium diet strategies and how to manage fluid intake with heart failure.',
      type: 'CORE_CONDITION' as const,
      estimatedMinutes: 6,
      daysPostDischarge: 7,
      difficulty: 2,
      conditions: [{ condition: 'HEART_FAILURE' as const, isPrimary: true }],
    },
    {
      slug: 'diabetes-hf-comorbidity-day7',
      title: 'Managing Diabetes with Heart Failure',
      description: 'How diabetes and heart failure interact, and how to manage both conditions together.',
      type: 'COMORBIDITY' as const,
      estimatedMinutes: 6,
      daysPostDischarge: 7,
      difficulty: 3,
      conditions: [
        { condition: 'HEART_FAILURE' as const, isPrimary: false },
        { condition: 'DIABETES' as const, isPrimary: false },
      ],
    },
    {
      slug: 'hf-activity-day10',
      title: 'Safe Activity and Exercise',
      description: 'How to safely increase your activity level and what exercises are right for you.',
      type: 'CORE_CONDITION' as const,
      estimatedMinutes: 5,
      daysPostDischarge: 10,
      difficulty: 2,
      conditions: [{ condition: 'HEART_FAILURE' as const, isPrimary: true }],
    },
    {
      slug: 'hf-follow-up-day10',
      title: 'Follow-Up Care and Appointments',
      description: 'What to expect at your follow-up visits and questions to ask your doctor.',
      type: 'CORE_CONDITION' as const,
      estimatedMinutes: 4,
      daysPostDischarge: 10,
      difficulty: 1,
      conditions: [{ condition: 'HEART_FAILURE' as const, isPrimary: true }],
    },
    {
      slug: 'hf-reinforcement-basics',
      title: 'Heart Failure Refresher: Key Points',
      description: 'A quick review of the most important things to remember about managing heart failure.',
      type: 'REINFORCEMENT' as const,
      estimatedMinutes: 3,
      daysPostDischarge: 30,
      refreshIntervalDays: 14,
      difficulty: 1,
      conditions: [{ condition: 'HEART_FAILURE' as const, isPrimary: true }],
    },
  ];

  for (const mod of modules) {
    const { conditions, refreshIntervalDays, ...modData } = mod;
    await prisma.learningModule.upsert({
      where: { slug: mod.slug },
      update: {},
      create: {
        ...modData,
        refreshIntervalDays,
        targetConditions: { create: conditions },
        contentBlocks: {
          create: [
            {
              order: 1,
              type: 'VIDEO',
              title: `Introduction to ${mod.title}`,
              content: `https://cdn.rastera.health/modules/${mod.slug}/intro.mp4`,
              durationSeconds: (mod.estimatedMinutes - 1) * 60,
              transcript: `This module covers ${mod.description}`,
              altText: `Video: ${mod.title}`,
            },
            {
              order: 2,
              type: 'TEXT',
              title: 'Key Takeaways',
              content: `## Key Points\n\n- Point 1 about ${mod.title}\n- Point 2 about managing your condition\n- Point 3: when to call your care team`,
            },
          ],
        },
        exercises: {
          create: [
            {
              order: 1,
              type: 'QUIZ',
              prompt: `Which of the following best describes a key concept from "${mod.title}"?`,
              maxScore: 100,
              passingScore: 70,
              failureAction: 'REPEAT',
              options: {
                create: [
                  { text: 'Correct answer about the topic', value: 'a', isCorrect: true, feedback: 'Correct! This is the key concept.' },
                  { text: 'Incorrect answer A', value: 'b', isCorrect: false, feedback: 'Not quite. Review the video.' },
                  { text: 'Incorrect answer B', value: 'c', isCorrect: false, feedback: 'Not quite. Review the key takeaways.' },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log(`Created ${modules.length} learning modules`);
  console.log(`Admin: admin@rastera.health / Admin123!`);
  console.log(`Coordinator: coordinator@rastera.health / Coord123!`);
  console.log(`Patient: patient@rastera.health / Patient123!`);
  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
