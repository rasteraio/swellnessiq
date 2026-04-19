/**
 * Demo mode mock data — Heart Failure patient, Day 8 post-discharge
 * Used when no live API is available.
 */

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();

// ── Auth ──────────────────────────────────────────────────────────────────────

export const DEMO_USER = {
  id: 'demo-user-001',
  email: 'patient@swellnessiq.com',
  firstName: 'James',
  lastName: 'Mitchell',
  role: 'PATIENT',
  patient: {
    id: 'demo-patient-001',
    primaryCondition: 'HEART_FAILURE',
    engagementLevel: 'GOOD',
    riskScore: 72,
  },
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const DEMO_DASHBOARD = {
  patient: {
    id: 'demo-patient-001',
    primaryCondition: 'HEART_FAILURE',
    engagementLevel: 'GOOD',
    riskScore: 72,
  },
  daysPostDischarge: 8,
  progress: { completed: 3, total: 12, rate: 0.25 },
  alerts: [],
  nextModule: {
    moduleId: 'mod-004',
    status: 'IN_PROGRESS',
    module: {
      id: 'mod-004',
      title: 'Daily Weigh-In Protocol',
      description: 'Why weighing yourself every morning is your single most important daily task.',
      estimatedMinutes: 3,
      type: 'CORE_CONDITION',
      isMandatory: true,
    },
  },
  upcomingModules: [
    {
      moduleId: 'mod-005',
      status: 'AVAILABLE',
      module: {
        id: 'mod-005',
        title: 'Warning Signs — Immediate 911 Required',
        description: 'Symptoms that mean call 911 right now — no waiting.',
        estimatedMinutes: 3,
        type: 'CORE_CONDITION',
        isMandatory: true,
      },
    },
    {
      moduleId: 'mod-006',
      status: 'AVAILABLE',
      module: {
        id: 'mod-006',
        title: 'Your Medications — Why Each One Matters',
        description: 'Each of your heart failure medications explained.',
        estimatedMinutes: 4,
        type: 'CORE_CONDITION',
        isMandatory: true,
      },
    },
  ],
  recentVitals: [
    { type: 'WEIGHT', value: 181, unit: 'lbs', loggedAt: daysAgo(1), isAbnormal: false },
    { type: 'BLOOD_PRESSURE_SYSTOLIC', value: 124, unit: 'mmHg', loggedAt: daysAgo(1), isAbnormal: false },
    { type: 'HEART_RATE', value: 72, unit: 'bpm', loggedAt: daysAgo(1), isAbnormal: false },
  ],
};

// ── Learning Plan ─────────────────────────────────────────────────────────────

const makeModule = (id: string, title: string, desc: string, type: string, minutes: number, mandatory: boolean) => ({
  id,
  title,
  description: desc,
  estimatedMinutes: minutes,
  type,
  isMandatory: mandatory,
});

export const DEMO_LEARNING_PLAN = {
  id: 'plan-demo-001',
  patientId: 'demo-patient-001',
  scheduledModules: [
    { moduleId: 'mod-001', status: 'COMPLETED', scheduledFor: daysAgo(9), module: makeModule('mod-001', 'How SwellnessIQ Works', 'A quick tour of your recovery companion.', 'PLATFORM_FUNDAMENTALS', 3, true) },
    { moduleId: 'mod-002', status: 'COMPLETED', scheduledFor: daysAgo(8), module: makeModule('mod-002', 'Your Recovery Is a Partnership', 'How SwellnessIQ, your care team, and you work together.', 'PLATFORM_FUNDAMENTALS', 3, true) },
    { moduleId: 'mod-003', status: 'COMPLETED', scheduledFor: daysAgo(7), module: makeModule('mod-003', 'What Is Heart Failure?', 'What heart failure means and what comes next.', 'CORE_CONDITION', 4, true) },
    { moduleId: 'mod-004', status: 'IN_PROGRESS', scheduledFor: daysAgo(6), module: makeModule('mod-004', 'Daily Weigh-In Protocol', 'Why weighing yourself every morning is your single most important daily task.', 'CORE_CONDITION', 3, true) },
    { moduleId: 'mod-005', status: 'AVAILABLE', scheduledFor: daysAgo(5), module: makeModule('mod-005', 'Warning Signs — Immediate 911 Required', 'Symptoms that mean call 911 right now — no waiting.', 'CORE_CONDITION', 3, true) },
    { moduleId: 'mod-006', status: 'AVAILABLE', scheduledFor: daysAgo(4), module: makeModule('mod-006', 'Your Medications — Why Each One Matters', 'Each of your heart failure medications explained.', 'CORE_CONDITION', 4, true) },
    { moduleId: 'mod-007', status: 'LOCKED', scheduledFor: daysAgo(2), module: makeModule('mod-007', 'Salt and Fluid Management', 'Low-sodium eating and fluid limits — practical strategies.', 'CORE_CONDITION', 4, false) },
    { moduleId: 'mod-008', status: 'LOCKED', scheduledFor: daysAgo(1), module: makeModule('mod-008', 'Warning Signs — Call Your Doctor Today', 'Symptoms that need your doctor today, not tomorrow.', 'CORE_CONDITION', 3, true) },
    { moduleId: 'mod-009', status: 'LOCKED', scheduledFor: daysAgo(0), module: makeModule('mod-009', 'Activity and Exercise Safety', 'How to safely increase your activity level during recovery.', 'CORE_CONDITION', 3, false) },
    { moduleId: 'mod-010', status: 'LOCKED', scheduledFor: new Date(today.getTime() + 2 * 86400000).toISOString(), module: makeModule('mod-010', 'Preparing for Your 7-Day Follow-Up', 'Questions to ask and what to expect at your first appointment.', 'CORE_CONDITION', 3, true) },
    { moduleId: 'mod-011', status: 'LOCKED', scheduledFor: new Date(today.getTime() + 3 * 86400000).toISOString(), module: makeModule('mod-011', 'Emotional Health and HF', 'Depression and anxiety are common after heart failure — here is how to cope.', 'CORE_CONDITION', 3, false) },
    { moduleId: 'mod-012', status: 'LOCKED', scheduledFor: new Date(today.getTime() + 4 * 86400000).toISOString(), module: makeModule('mod-012', 'Managing Your Daily HF Diary', 'How to track weight, symptoms, and how you feel every day.', 'CORE_CONDITION', 3, false) },
  ],
};

// ── Module Detail ─────────────────────────────────────────────────────────────

const DEMO_MODULES: Record<string, any> = {
  'mod-004': {
    id: 'mod-004',
    title: 'Daily Weigh-In Protocol',
    type: 'CORE_CONDITION',
    estimatedMinutes: 3,
    isMandatory: true,
    contentBlocks: [
      {
        id: 'cb-001',
        type: 'TEXT',
        title: 'Why daily weighing matters',
        content: `## Your scale is an early warning system

When your heart isn't pumping efficiently, fluid can build up in your body. This fluid buildup happens *before* you feel short of breath or notice swelling — but your scale catches it early.

**The rule is simple:** If you gain more than 2 pounds in one day, or 5 pounds in one week, call your doctor the same day.

### When to weigh yourself
- Every morning, right after waking up
- After using the bathroom
- Before eating or drinking anything
- Wearing the same clothing each time (or no clothing)

### What to record
Write down your weight in the same place every day — a notebook, a phone app, or the diary in this app. Bring it to every doctor's appointment.`,
      },
      {
        id: 'cb-002',
        type: 'TEXT',
        title: 'What to do with your number',
        content: `## Acting on what you see

**Normal variation:** Up to 1–2 lbs day-to-day is normal (water, food, time of day).

**Call your doctor today if:**
- You gained more than **2 lbs since yesterday**
- You gained more than **5 lbs since last week**
- You notice new or worsening ankle swelling
- You feel more short of breath than usual

**Call 911 immediately if:**
- You have sudden severe shortness of breath
- You can't lie flat without gasping
- You feel chest pain or pressure

### Setting your baseline
Your care team will tell you your "dry weight" — this is the weight you're at when your fluid levels are normal. Use this as your reference point every day.`,
      },
    ],
    exercises: [
      {
        id: 'ex-001',
        type: 'MULTIPLE_CHOICE',
        question: 'You weigh yourself Monday morning and find you gained 3 lbs since Sunday. What should you do?',
        options: ['Wait and see if it goes down by tomorrow', 'Call your doctor today', 'Drink more water to flush it out', 'Skip your diuretic medication'],
        correctAnswer: 'Call your doctor today',
        explanation: 'A gain of more than 2 lbs in one day is a warning sign of fluid buildup. Call your doctor the same day — do not wait.',
      },
      {
        id: 'ex-002',
        type: 'MULTIPLE_CHOICE',
        question: 'When is the best time to weigh yourself?',
        options: ['After dinner, once a week', 'Every morning before eating, after using the bathroom', 'Only when you feel bloated', 'Before bed, fully dressed'],
        correctAnswer: 'Every morning before eating, after using the bathroom',
        explanation: 'Morning weigh-ins before eating give you the most consistent, comparable readings — this is how your care team will interpret the numbers.',
      },
    ],
  },
  'mod-005': {
    id: 'mod-005',
    title: 'Warning Signs — Immediate 911 Required',
    type: 'CORE_CONDITION',
    estimatedMinutes: 3,
    isMandatory: true,
    contentBlocks: [
      {
        id: 'cb-003',
        type: 'TEXT',
        title: 'Signs that need 911 — right now',
        content: `## Do not wait. Call 911 immediately if you have any of these.

These symptoms can mean your heart failure is worsening rapidly. Minutes matter.

### Call 911 immediately for:

**Breathing problems**
- Sudden severe shortness of breath
- Can't catch your breath even sitting still
- Waking up from sleep unable to breathe
- Gasping or feeling like you're suffocating

**Chest symptoms**
- Chest pain, pressure, tightness, or squeezing
- Pain radiating to your arm, jaw, neck, or back
- New or unusual chest discomfort of any kind

**Other emergency signs**
- Fainting or loss of consciousness
- Sudden confusion or trouble speaking
- Heart racing out of control (over 150 beats per minute)
- Turning blue around the lips or fingertips

### What to tell the 911 operator
"I have heart failure and I'm having [describe your symptom]. I was recently discharged from the hospital."`,
      },
    ],
    exercises: [
      {
        id: 'ex-003',
        type: 'MULTIPLE_CHOICE',
        question: 'You wake up at 3am unable to breathe and have to sit up immediately to catch your breath. What do you do?',
        options: ['Try to go back to sleep and call your doctor in the morning', 'Call 911 immediately', 'Take an extra water pill and wait', 'Call a family member to drive you to urgent care'],
        correctAnswer: 'Call 911 immediately',
        explanation: 'Waking unable to breathe (orthopnea/paroxysmal nocturnal dyspnea) is a medical emergency in heart failure. Call 911 — do not drive yourself.',
      },
      {
        id: 'ex-004',
        type: 'MULTIPLE_CHOICE',
        question: 'Which of these is an immediate 911 symptom?',
        options: ['Mild ankle swelling that has been there for 2 days', 'Weight gain of 1 lb since yesterday', 'Chest pain radiating to your left arm', 'Feeling tired after walking up stairs'],
        correctAnswer: 'Chest pain radiating to your left arm',
        explanation: 'Chest pain radiating to the arm is a classic sign of a heart attack — this requires 911 immediately. The other symptoms are concerning but warrant a call to your doctor, not 911.',
      },
    ],
  },
};

// Add fallback for any module ID
const FALLBACK_MODULE = (id: string) => ({
  id,
  title: 'Lesson',
  type: 'CORE_CONDITION',
  estimatedMinutes: 3,
  isMandatory: false,
  contentBlocks: [
    {
      id: 'cb-fallback',
      type: 'TEXT',
      title: 'Coming soon',
      content: '## This lesson is being prepared\n\nCheck back soon for the full content.',
    },
  ],
  exercises: [],
});

export const getDemoModule = (id: string) => DEMO_MODULES[id] || FALLBACK_MODULE(id);

// ── Vitals ────────────────────────────────────────────────────────────────────

const weightData = [183, 184, 182, 183, 181, 182, 180, 181, 180, 181].map((v, i) => ({
  value: v, unit: 'lbs', loggedAt: daysAgo(9 - i),
  isAbnormal: v >= 183,
}));
const bpSysData = [128, 126, 124, 125, 122, 124, 121, 123, 122, 124].map((v, i) => ({
  value: v, unit: 'mmHg', loggedAt: daysAgo(9 - i), isAbnormal: v > 130,
}));
const bpDiaData = [80, 79, 78, 77, 76, 78, 75, 77, 76, 78].map((v, i) => ({
  value: v, unit: 'mmHg', loggedAt: daysAgo(9 - i), isAbnormal: v > 80,
}));
const hrData = [76, 74, 72, 75, 70, 72, 71, 73, 72, 72].map((v, i) => ({
  value: v, unit: 'bpm', loggedAt: daysAgo(9 - i), isAbnormal: false,
}));

export const DEMO_VITALS = {
  grouped: {
    WEIGHT: weightData,
    BLOOD_PRESSURE_SYSTOLIC: bpSysData,
    BLOOD_PRESSURE_DIASTOLIC: bpDiaData,
    HEART_RATE: hrData,
  },
};

// ── Chat ──────────────────────────────────────────────────────────────────────

export const DEMO_CHAT_SESSIONS: any[] = [];

export const DEMO_NEW_SESSION = {
  sessionId: 'demo-session-001',
  messages: [],
};

export const DEMO_CHAT_RESPONSES: Record<string, string> = {
  default: `I'm the SwellnessIQ Assistant — I'm here to help you understand your heart failure recovery.

I can answer questions about:
- Your medications and why they matter
- Warning signs to watch for
- Your daily weigh-in and what the numbers mean
- Diet, activity, and fluid guidelines
- What to expect at your follow-up appointment

**Remember:** For urgent symptoms, call **911** or your care team immediately — I'm here for education, not emergencies.

What would you like to know?`,
};
