// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  PATIENT = 'PATIENT',
  CARE_COORDINATOR = 'CARE_COORDINATOR',
  CLINICIAN = 'CLINICIAN',
  ADMIN = 'ADMIN',
}

export enum ModuleType {
  CORE_CONDITION = 'CORE_CONDITION',
  SELF_MONITORING = 'SELF_MONITORING',
  BRANCHING = 'BRANCHING',
  POLYPHARMACY = 'POLYPHARMACY',
  SOCIAL_DETERMINANTS = 'SOCIAL_DETERMINANTS',
  REINFORCEMENT = 'REINFORCEMENT',
  PLATFORM_FUNDAMENTALS = 'PLATFORM_FUNDAMENTALS',
}

export enum ModuleStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

// Primary HRRP conditions (6 penalized conditions + cross-cutting comorbidities)
export enum Condition {
  // Primary HRRP conditions
  HEART_FAILURE = 'HEART_FAILURE',
  COPD = 'COPD',
  ACUTE_MI = 'ACUTE_MI',
  CABG = 'CABG',
  THA_TKA = 'THA_TKA',
  PNEUMONIA = 'PNEUMONIA',
  // Comorbidities (used for branching logic)
  DIABETES = 'DIABETES',
  CKD = 'CKD',
  ATRIAL_FIBRILLATION = 'ATRIAL_FIBRILLATION',
  HEART_FAILURE_COMORBID = 'HEART_FAILURE_COMORBID',
  ANXIETY_DEPRESSION = 'ANXIETY_DEPRESSION',
  HYPERTENSION = 'HYPERTENSION',
}

export enum EngagementLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  AT_RISK = 'AT_RISK',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  PHONE = 'PHONE',
}

export enum EngagementEscalation {
  PUSH_48H = 'PUSH_48H',
  CLINICAL_ALERT_72H = 'CLINICAL_ALERT_72H',
  PHONE_OUTREACH_96H = 'PHONE_OUTREACH_96H',
}

// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface PatientProfile {
  id: string;
  userId: string;
  dischargeDate: Date;
  primaryCondition: Condition;
  comorbidities: Condition[];
  medications: Medication[];
  engagementLevel: EngagementLevel;
  riskScore: number;            // 0–100 readmission risk
  laceScore?: number;           // LACE+ index (Length, Acuity, Comorbidity, ED visits)
  isIntensiveTrack: boolean;    // true when LACE+ ≥10
  isMaintenanceMode: boolean;   // true after 3 consecutive ≥80% — monthly cadence
  caregiverEnrolled: boolean;
  preferredLanguage: string;
  simplifiedLanguage: boolean;  // 4th-grade level for SDOH-positive patients
  accessibilityNeeds: AccessibilityConfig;
  careTeamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  startDate: Date;
  endDate?: Date;
}

export interface AccessibilityConfig {
  largeText: boolean;
  highContrast: boolean;
  screenReader: boolean;
  simplifiedLanguage: boolean;
  preferredMediaType: 'VIDEO' | 'AUDIO' | 'TEXT';
  captionsEnabled: boolean;
  audioOnly: boolean;
}

// ─── Module Architecture (Four-Part Structure) ────────────────────────────────

export interface LearningModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ModuleType;
  targetConditions: Condition[];
  daysPostDischarge: number;     // Negative = pre-discharge (e.g., -1 = day before)
  estimatedMinutes: number;
  isMandatory: boolean;          // Non-skippable (medication list, warning signs, etc.)
  masteryThreshold: number;      // Default 80 (%)
  contentBlocks: ContentBlock[]; // Hook → Core → Application → Check
  exercises: Exercise[];
  branchingRules: BranchingRule[];
  prerequisites: string[];
  refreshIntervalDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentBlock {
  id: string;
  order: number;
  phase: 'HOOK' | 'CORE' | 'APPLICATION' | 'KNOWLEDGE_CHECK';
  type: 'VIDEO' | 'TEXT' | 'INFOGRAPHIC' | 'ANIMATION';
  title: string;
  content: string;
  durationSeconds?: number;
  transcript?: string;
  altText?: string;
}

export interface Exercise {
  id: string;
  moduleId: string;
  order: number;
  type: 'QUIZ' | 'CHECKIN' | 'SYMPTOM_LOG' | 'VITAL_LOG' | 'REFLECTION';
  prompt: string;
  options?: ExerciseOption[];
  correctAnswerId?: string;
  masteryThreshold: number; // 80%
  failureAction: 'IMMEDIATE_REINFORCEMENT' | 'SHORTENED_INTERVAL' | 'CLINICAL_ALERT';
  consecutiveFailureLimit: number; // default 3 — triggers nurse navigator alert
}

export interface ExerciseOption {
  id: string;
  text: string;
  value: string;
  isCorrect: boolean;
  nextModuleId?: string;
  feedback?: string;
}

export interface BranchingRule {
  id: string;
  condition: BranchCondition;
  action: BranchAction;
  priority: number;
}

export interface BranchCondition {
  type: 'SCORE' | 'RESPONSE' | 'ENGAGEMENT' | 'CONDITION' | 'DAYS_POST_DISCHARGE'
      | 'LACE_SCORE' | 'MEDICATION_COUNT' | 'NO_ENGAGEMENT_HOURS' | 'CONSECUTIVE_FAILURES';
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE' | 'IN';
  value: string | number | string[];
  exerciseId?: string;
}

export interface BranchAction {
  type: 'UNLOCK_MODULE' | 'SKIP_MODULE' | 'ADD_MODULE' | 'ESCALATE_TO_CARE_TEAM'
      | 'SEND_ALERT' | 'REQUIRE_CAREGIVER' | 'SET_INTENSIVE_TRACK' | 'BYPASS_TO_EMERGENCY';
  targetModuleId?: string;
  alertMessage?: string;
}

export interface PatientProgress {
  id: string;
  patientId: string;
  moduleId: string;
  status: ModuleStatus;
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  consecutiveFailures: number;
  attemptCount: number;
  exerciseResponses: ExerciseResponse[];
  timeSpentSeconds: number;
  engagementScore: number;
}

export interface ExerciseResponse {
  exerciseId: string;
  selectedOptionId?: string;
  freeTextResponse?: string;
  numericValue?: number;
  respondedAt: Date;
}

export interface LearningPlan {
  id: string;
  patientId: string;
  track: 'STANDARD' | 'INTENSIVE' | 'MAINTENANCE';
  scheduledModules: ScheduledModule[];
  generatedAt: Date;
  lastAdaptedAt: Date;
  adaptationHistory: AdaptationEvent[];
  consecutivePasses: number; // 3 = graduation to maintenance
}

export interface ScheduledModule {
  moduleId: string;
  scheduledDate: Date;
  actualDeliveryDate?: Date;
  status: ModuleStatus;
  isAdaptive: boolean;
  reason?: string;
}

export interface AdaptationEvent {
  timestamp: Date;
  trigger: string;
  modulesAdded: string[];
  modulesRemoved: string[];
  explanation: string;
}

export interface Alert {
  id: string;
  patientId: string;
  severity: AlertSeverity;
  type: 'SYMPTOM' | 'ENGAGEMENT' | 'MEDICATION' | 'VITAL' | 'MISSED_MODULE'
      | 'NURSE_NAVIGATOR' | 'EMERGENCY_BYPASS';
  message: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface CareMessage {
  id: string;
  patientId: string;
  authorId: string;
  authorRole: UserRole;
  content: string;
  isRead: boolean;
  threadId: string;
  attachments?: string[];
  createdAt: Date;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  hasMore?: boolean;
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface PatientAnalytics {
  patientId: string;
  moduleCompletionRate: number;
  firstAttemptPassRate: number;    // Target ≥75% per module
  timeToFirstView: number;         // Hours — target <24h; alert >48h
  reServeRate: number;             // >30% indicates content review needed
  averageScore: number;
  totalEngagementMinutes: number;
  streakDays: number;
  lastActiveAt: Date;
  engagementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  predictedReadmissionRisk: number;
  alertCount: number;
  consecutivePasses: number;
  track: 'STANDARD' | 'INTENSIVE' | 'MAINTENANCE';
}

export interface CohortAnalytics {
  totalPatients: number;
  activePatients: number;
  averageEngagementRate: number;
  averageCompletionRate: number;
  averageFirstAttemptPassRate: number;
  readmissionRate: number;
  conditionBreakdown: Record<string, number>;
  engagementBreakdown: Record<EngagementLevel, number>;
}

// ─── AI Types ─────────────────────────────────────────────────────────────────

export interface AIRecommendation {
  moduleId: string;
  reason: string;
  confidenceScore: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  patientId: string;
  messages: ChatMessage[];
  context: PatientChatContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientChatContext {
  primaryCondition: Condition;
  comorbidities: Condition[];
  medications: string[];
  recentModulesCompleted: string[];
  activeAlerts: string[];
  daysPostDischarge: number;
  isIntensiveTrack: boolean;
}
