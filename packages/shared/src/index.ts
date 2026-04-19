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
  COMORBIDITY = 'COMORBIDITY',
  POLYPHARMACY = 'POLYPHARMACY',
  SOCIAL_DETERMINANTS = 'SOCIAL_DETERMINANTS',
  REINFORCEMENT = 'REINFORCEMENT',
}

export enum ModuleStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum Condition {
  HEART_FAILURE = 'HEART_FAILURE',
  COPD = 'COPD',
  AMI = 'AMI',
  CABG = 'CABG',
  KIDNEY_DISEASE = 'KIDNEY_DISEASE',
  PNEUMONIA = 'PNEUMONIA',
  DIABETES = 'DIABETES',
  HYPERTENSION = 'HYPERTENSION',
  ATRIAL_FIBRILLATION = 'ATRIAL_FIBRILLATION',
  STROKE = 'STROKE',
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
  riskScore: number; // 0-100, readmission risk
  preferredLanguage: string;
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
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  type: ModuleType;
  targetConditions: Condition[];
  daysPostDischarge: number;
  estimatedMinutes: number;
  contentBlocks: ContentBlock[];
  exercises: Exercise[];
  branchingRules: BranchingRule[];
  prerequisites: string[]; // module IDs
  refreshIntervalDays?: number;
  aiGeneratedSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentBlock {
  id: string;
  order: number;
  type: 'VIDEO' | 'TEXT' | 'INFOGRAPHIC' | 'ANIMATION';
  title: string;
  content: string; // URL for video/image, markdown for text
  durationSeconds?: number;
  transcript?: string;
  altText?: string; // accessibility
}

export interface Exercise {
  id: string;
  moduleId: string;
  order: number;
  type: 'QUIZ' | 'CHECKIN' | 'SYMPTOM_LOG' | 'VITAL_LOG' | 'REFLECTION';
  prompt: string;
  options?: ExerciseOption[];
  correctAnswerId?: string;
  scoringLogic?: ScoringLogic;
}

export interface ExerciseOption {
  id: string;
  text: string;
  value: string;
  nextModuleId?: string; // branching
  feedback?: string;
}

export interface ScoringLogic {
  passingScore: number;
  maxScore: number;
  failureAction: 'REPEAT' | 'BRANCH' | 'ESCALATE';
  failureBranchModuleId?: string;
}

export interface BranchingRule {
  id: string;
  condition: BranchCondition;
  action: BranchAction;
  priority: number;
}

export interface BranchCondition {
  type: 'SCORE' | 'RESPONSE' | 'ENGAGEMENT' | 'CONDITION' | 'DAYS_POST_DISCHARGE';
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE' | 'IN';
  value: string | number | string[];
  exerciseId?: string;
}

export interface BranchAction {
  type: 'UNLOCK_MODULE' | 'SKIP_MODULE' | 'ADD_MODULE' | 'ESCALATE_TO_CARE_TEAM' | 'SEND_ALERT';
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
  exerciseResponses: ExerciseResponse[];
  timeSpentSeconds: number;
  engagementScore: number; // 0-100
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
  scheduledModules: ScheduledModule[];
  generatedAt: Date;
  lastAdaptedAt: Date;
  adaptationHistory: AdaptationEvent[];
}

export interface ScheduledModule {
  moduleId: string;
  scheduledDate: Date;
  actualDeliveryDate?: Date;
  status: ModuleStatus;
  isAdaptive: boolean; // true if added by AI engine
  reason?: string; // why it was added (e.g., "low quiz score on CHF basics")
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
  type: 'SYMPTOM' | 'ENGAGEMENT' | 'MEDICATION' | 'VITAL' | 'MISSED_MODULE';
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
  moduleCompletionRate: number; // 0-1
  averageScore: number;
  totalEngagementMinutes: number;
  streakDays: number;
  lastActiveAt: Date;
  engagementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  predictedReadmissionRisk: number; // 0-100
  alertCount: number;
}

export interface CohortAnalytics {
  totalPatients: number;
  activePatients: number;
  averageEngagementRate: number;
  averageCompletionRate: number;
  readmissionRate: number;
  conditionBreakdown: Record<Condition, number>;
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
}
