# Rastera Health — System Architecture

## 1. Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RASTERA HEALTH PLATFORM                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                                      │
│                                                                               │
│   ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────────┐  │
│   │  Patient Web App │    │ Care Team Portal  │    │  Admin Dashboard       │  │
│   │  (Next.js PWA)   │    │ (Next.js)         │    │  (Next.js)             │  │
│   │  Mobile-first    │    │ Desktop-first     │    │  Analytics + Mgmt      │  │
│   └────────┬─────────┘    └────────┬──────────┘    └───────────┬────────────┘  │
│            │                       │                             │               │
└────────────┼───────────────────────┼─────────────────────────────┼───────────────┘
             │                       │                             │
             └───────────────────────┼─────────────────────────────┘
                                     │ HTTPS / REST API
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  API GATEWAY  (future: Kong / AWS API Gateway)                                │
│  - Rate limiting    - Auth forwarding    - Request logging                    │
└──────────────────────┬───────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  BACKEND API  (Node.js + Express + TypeScript)                                │
│                                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Auth Service │  │ Patient Svc  │  │ Learning Svc  │  │ Engagement Svc  │  │
│  │ JWT + bcrypt │  │ Profile CRUD │  │ Plan Engine   │  │ Level Tracking  │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  AI Service  │  │  Chat Svc    │  │ Notification  │  │  Analytics Svc  │  │
│  │ Claude API   │  │ Claude API   │  │  Svc          │  │  Snapshots      │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  CRON SCHEDULER (node-cron)                                           │    │
│  │  • Hourly: Unlock due modules                                         │    │
│  │  • Daily 9am: Send reminders                                          │    │
│  │  • Daily midnight: Update engagement levels + risk scores             │    │
│  │  • Weekly: Schedule reinforcement modules                             │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        │              │                  │
        ▼              ▼                  ▼
┌──────────────┐ ┌───────────┐ ┌─────────────────────────────┐
│  PostgreSQL  │ │  Redis    │ │  Anthropic Claude API        │
│  (Prisma)    │ │  Cache    │ │                              │
│              │ │  Sessions │ │  • claude-opus-4-6           │
│  Patient DB  │ │  Rate     │ │    (recommendations,         │
│  Modules     │ │  Limiting │ │     risk scoring, chat)      │
│  Progress    │ └───────────┘ │  • claude-haiku-4-5          │
│  Analytics   │               │    (nudge messages)          │
│  Audit Logs  │               │  • Prompt caching enabled    │
└──────────────┘               └─────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│  EHR INTEGRATION (Future)    │
│  FHIR R4 / SMART on FHIR     │
│  Epic • Cerner • Allscripts  │
└──────────────────────────────┘
```

---

## 2. Adaptive Learning Flow (Pseudo-code)

```
FUNCTION process_module_completion(patient_id, module_id, responses):

  # Step 1: Score the responses
  score = calculate_score(responses, module.exercises)
  engagement_score = time_spent / module.estimated_duration * 100

  # Step 2: Persist progress
  save_progress(patient_id, module_id, score, responses)

  # Step 3: Check branching rules (priority-ordered)
  FOR rule IN module.branching_rules ORDER BY priority:
    condition_met = evaluate(rule.condition, score, patient.conditions, patient.engagement)

    IF condition_met:
      MATCH rule.action_type:
        CASE "ADD_MODULE":
          IF rule.target_module NOT IN patient.plan:
            schedule_module(patient_id, rule.target_module, days_ahead=2)
            log_adaptation(patient_id, trigger="BRANCHING_RULE", module_added=rule.target_module)

        CASE "ESCALATE_TO_CARE_TEAM":
          create_alert(patient_id, severity="HIGH", message=rule.alert_message)
          notify_care_team(patient_id)

        CASE "SKIP_MODULE":
          mark_module_skipped(patient_id, rule.target_module)

  # Step 4: Update engagement level
  new_level = compute_engagement(patient_id)
  IF new_level < previous_level:
    nudge = ai.generate_nudge(patient_id)
    send_notification(patient_id, nudge)

  IF new_level == "AT_RISK":
    create_alert(patient_id, severity="MEDIUM", type="ENGAGEMENT")
    IF score < 60:
      ai_recs = ai.get_recommendations(patient_id)
      FOR rec IN ai_recs[:2]:
        schedule_adaptive_module(patient_id, rec.module_id, rec.reason)

  # Step 5: Check for streak milestones
  streak = compute_streak(patient_id)
  IF streak IN [3, 7, 14, 30]:
    send_milestone_notification(patient_id, streak)

  # Step 6: Update risk score asynchronously
  ASYNC: risk_score = ai.compute_risk_score(patient_id)
        update_patient(patient_id, risk_score=risk_score)

  RETURN {score, passed: score >= module.passing_score, feedback: generate_feedback(score)}


FUNCTION unlock_scheduled_modules():  # Runs hourly
  due_modules = db.scheduled_modules.where(
    status="LOCKED",
    scheduled_date <= NOW()
  )
  FOR module IN due_modules:
    module.status = "AVAILABLE"
    notify_patient(module.patient_id, module.title)
```

---

## 3. Database Schema (Key Relationships)

```
User (1) ──────────────── (1) PatientProfile
                                    │
                    ┌───────────────┼────────────────────┐
                    │               │                     │
               (many)          (many)               (1)
            PatientCondition  Medication          LearningPlan
                                                       │
                                                  (many)
                                              ScheduledModule
                                                    │ references
                                              LearningModule
                                                    │
                              ┌──────────────────────┼──────────────────┐
                         (many)                  (many)               (many)
                      ContentBlock            Exercise             BranchingRule
                                                  │
                                             (many)
                                          ExerciseOption

PatientProfile (1) ── (many) PatientProgress
PatientProgress (1) ── (many) ExerciseResponse
PatientProfile (1) ── (many) VitalLog
PatientProfile (1) ── (many) SymptomLog
PatientProfile (1) ── (many) Alert
PatientProfile (1) ── (many) ChatSession (many) ── ChatMessage
PatientProfile (1) ── (many) CareMessage ── (1) User [author]
```

---

## 4. API Route Structure

```
/api/v1/
├── auth/
│   ├── POST   /register          # Patient/staff registration
│   ├── POST   /login             # Login → access + refresh tokens
│   ├── POST   /refresh           # Refresh access token
│   ├── POST   /logout            # Revoke session
│   └── GET    /me                # Current user profile
│
├── patients/
│   ├── GET    /me                # Patient's own profile
│   ├── GET    /                  # List patients [care team]
│   ├── GET    /:id               # Get patient [care team]
│   ├── PATCH  /:id               # Update patient
│   ├── POST   /:id/conditions    # Add comorbidity
│   └── GET    /:id/dashboard     # Dashboard data
│
├── modules/
│   ├── GET    /                  # List modules (filterable)
│   ├── GET    /:id               # Full module with content
│   └── POST   /                  # Create module [admin]
│
├── learning-plans/
│   ├── GET    /:patientId        # Get plan with schedule
│   └── POST   /:patientId/generate  # Generate/reset plan
│
├── progress/
│   ├── POST   /:moduleId/start   # Mark module started
│   ├── POST   /:moduleId/complete # Submit responses + score
│   └── GET    /patient/:patientId  # All progress records
│
├── chat/
│   ├── POST   /sessions          # Create chat session
│   ├── GET    /sessions          # List sessions
│   ├── GET    /sessions/:id      # Get session + messages
│   └── POST   /sessions/:id/messages  # Send message (Claude)
│
├── vitals/
│   ├── POST   /                  # Log vital
│   └── GET    /:patientId        # Get vitals (grouped)
│
├── alerts/
│   ├── GET    /                  # All unacknowledged [care team]
│   ├── GET    /patient/:id       # Patient alerts
│   └── PATCH  /:id/acknowledge   # Acknowledge [care team]
│
├── messages/
│   ├── GET    /patient/:id       # Message threads
│   ├── POST   /                  # Send message
│   └── PATCH  /:id/read          # Mark read
│
├── analytics/
│   ├── GET    /patient/:id       # Patient analytics
│   └── GET    /cohort            # Aggregate analytics [care team]
│
├── notifications/
│   ├── GET    /                  # Pending notifications
│   ├── PATCH  /:id/read          # Mark read
│   └── POST   /mark-all-read     # Mark all read
│
├── care-team/
│   ├── GET    /my-patients       # Care team's patients
│   └── GET    /dashboard         # Summary stats
│
└── admin/
    ├── POST   /patients/:id/generate-plan  # Regenerate plan
    ├── POST   /unlock-modules              # Manual trigger
    └── GET    /audit-logs                  # HIPAA audit trail
```

---

## 5. Learning Module Timeline

```
DISCHARGE
   │
   ├── Day 2 ──► Core condition intro + Daily monitoring setup
   │            (Heart Failure Basics, Daily Weight Monitoring)
   │
   ├── Day 5 ──► Medication management + Symptom recognition
   │            (Your Medications, Warning Signs)
   │
   ├── Day 7 ──► Diet, fluid management + Comorbidity modules
   │            (Diet & Fluids, Diabetes+HF if applicable)
   │
   ├── Day 10 ──► Activity & exercise + Follow-up care
   │             (Safe Activity, Your Follow-Up Appointments)
   │
   ├── Day 14 ──► SDOH check-in + Polypharmacy if 5+ meds
   │             (Support Resources, Medication Review)
   │
   ├── Day 21 ──► First reinforcement cycle
   │             (Knowledge Refresher: Condition Basics)
   │
   ├── Day 30 ──► 30-day milestone + Risk reassessment
   │             (30-Day Check-In, Progress Review)
   │
   ├── Day 60 ──► Mid-term modules
   │             (Long-term Management, Lifestyle Optimization)
   │
   └── Day 90–180 ──► Maintenance + Reinforcement cycles
                      (Ongoing education, 14-day refresh intervals)

ADAPTIVE BRANCHES (can occur at any point):
  • Low quiz score (<60%) → Reinforcement module added (2 days out)
  • Engagement drops to LOW → AI nudge + AI-recommended module
  • Engagement AT_RISK → Care team alert + AI intervention module
  • New comorbidity added → Relevant comorbidity modules injected
  • Abnormal vital logged → Alert + targeted self-monitoring module
```

---

## 6. AI Integration Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI LAYER — Anthropic Claude                                                  │
│                                                                               │
│  MODEL SELECTION BY USE CASE:                                                 │
│                                                                               │
│  claude-opus-4-6 (primary)                                                    │
│  ├── Module recommendations (complex reasoning, patient profile analysis)    │
│  ├── Readmission risk scoring (multi-factor clinical reasoning)               │
│  ├── Patient chat assistant (nuanced, safe health guidance)                  │
│  └── Content simplification (plain-language rewriting)                       │
│                                                                               │
│  claude-haiku-4-5 (lightweight tasks)                                         │
│  └── Behavioral nudge generation (short, fast, cheap)                        │
│                                                                               │
│  PROMPT CACHING (cost + latency optimization):                                │
│  ├── System prompts cached with cache_control: {type: "ephemeral"}           │
│  ├── Patient context injected per-call (not cached — changes frequently)     │
│  └── Expected cache hit rate: ~70-80% on chat sessions                       │
│                                                                               │
│  GUARDRAILS:                                                                  │
│  ├── Explicit non-diagnostic framing in all system prompts                   │
│  ├── Emergency keyword detection → immediate 911 instruction                 │
│  ├── All AI outputs logged and auditable                                      │
│  └── Fallback rule-based logic if API unavailable                            │
│                                                                               │
│  FUTURE ENHANCEMENTS:                                                         │
│  ├── Fine-tuned models on anonymized patient interaction data                │
│  ├── AI-generated video script creation (to integrate with HeyGen/Synthesia) │
│  ├── Multimodal content analysis (patient-uploaded symptom photos)           │
│  └── Predictive outreach (proactive care team alerts before engagement drop) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. HIPAA Compliance Architecture

```
DATA PROTECTION:
├── PHI encrypted at rest (PostgreSQL TDE / AWS RDS encryption)
├── PHI encrypted in transit (TLS 1.3 minimum)
├── Passwords hashed with bcrypt (cost factor 12)
├── JWT tokens with short TTL (15 minutes access, 7 days refresh)
├── Session invalidation on logout + server-side revocation list
└── No PHI in logs — audit logs use resource IDs, not PHI content

ACCESS CONTROLS:
├── Role-based access: PATIENT | CARE_COORDINATOR | CLINICIAN | ADMIN
├── Patients can only access their own data (enforced at API layer)
├── Care team access scoped to assigned patients
├── Admin access with additional MFA requirement
└── All PHI access logged in audit_logs table (HIPAA §164.312(b))

AUDIT TRAIL:
├── Every PHI read/write creates an AuditLog record
├── Logs capture: userId, action, resourceType, resourceId, IP, timestamp
├── Logs are append-only (no delete operations on audit table)
├── Minimum retention: 6 years (HIPAA requirement)
└── Exportable for compliance audits

INFRASTRUCTURE:
├── Separate VPC for database servers (no public internet access)
├── API servers in private subnets behind load balancer
├── Redis in private subnet (no AUTH bypass)
├── AWS CloudTrail for infrastructure-level audit
└── Automated backups with point-in-time recovery

BUSINESS ASSOCIATE AGREEMENTS (BAA):
├── Anthropic (Claude API) — BAA required before production
├── AWS / GCP / Azure — BAA available
├── Twilio (SMS) — BAA available
└── SendGrid (email) — BAA available
```

---

## 8. EHR Integration (FHIR)

```
FHIR R4 INTEGRATION:

Patient Import:
  GET [base]/Patient?identifier=[MRN]
    → Map to PatientProfile (name, DOB, address)

Conditions Import:
  GET [base]/Condition?patient=[id]&category=encounter-diagnosis
    → Map to PatientCondition (primaryCondition, comorbidities)

Medications Import:
  GET [base]/MedicationRequest?patient=[id]&status=active
    → Map to Medication (name, dosage, frequency, instructions)

Discharge Summary:
  GET [base]/Encounter?patient=[id]&type=discharged
    → Extract dischargeDate, admissionDate

Vital Signs Export:
  POST [base]/Observation
    → Push patient-entered vitals back to EHR

SMART on FHIR:
  - OAuth 2.0 patient-facing launch
  - EHR-embedded launch context
  - Scopes: patient/*.read, user/Patient.write

IMPLEMENTATION PLAN:
  1. Epic MyChart patient app integration (SMART on FHIR)
  2. Cerner Patient Portal integration
  3. Allscripts Follow My Health integration
  4. HL7 v2 ADT feed for real-time discharge notifications
```

---

## 9. Monetization Model

```
B2B SaaS (Primary Revenue)

TIER 1 — HOSPITAL SYSTEMS ($3–8 / patient / month)
  ├── Per-discharged-patient licensing
  ├── Target: 30-day readmission reduction → direct ROI
  ├── Hospital readmission penalty avoidance (CMS HRRP)
  ├── Average hospital: 500–2,000 discharges/month = $18K–$192K/mo per hospital
  └── Value prop: 1% readmission reduction saves ~$500K/year for 1,000-bed hospital

TIER 2 — HEALTH PLANS / PAYERS ($5–12 PMPM)
  ├── Per-member-per-month model for managed care populations
  ├── Risk stratification + care management integration
  ├── Quality measure improvement (HEDIS, STAR ratings)
  └── Value-based care alignment

TIER 3 — ACCOUNTABLE CARE ORGANIZATIONS
  ├── Shared savings model (% of readmission cost avoidance)
  ├── Bundled payment alignment
  └── Population health management tool

TIER 4 — ENTERPRISE (Custom)
  ├── White-label for large health systems
  ├── EHR native integration (Epic App Orchard, Cerner App Store)
  └── Custom content development (condition-specific modules)

COST STRUCTURE:
  ├── Claude API: ~$0.15–0.60 / patient / month (with prompt caching)
  ├── Infrastructure: ~$0.20–0.50 / patient / month
  └── Margin target: 70–75% gross margin at scale
```

---

## 10. MVP vs Future Roadmap

```
MVP (Months 1-3):
  ✓ Patient registration + login
  ✓ Learning plan generation (rule-based, no AI)
  ✓ Module delivery (video + text + quiz)
  ✓ Basic adaptive branching (score-based)
  ✓ Vital logging + abnormal alerts
  ✓ Care team message inbox
  ✓ Push notifications
  ✓ Mobile-first web app (PWA)

Phase 2 (Months 4-6):
  ○ AI-powered recommendations (Claude integration)
  ○ AI chat assistant (RasteraAssist)
  ○ Engagement level tracking + nudges
  ○ Care team dashboard + analytics
  ○ FHIR patient data import
  ○ Readmission risk scoring

Phase 3 (Months 7-12):
  ○ AI-generated video content pipeline
  ○ EHR bidirectional sync (Epic SMART on FHIR)
  ○ Native iOS/Android apps (React Native)
  ○ Comorbidity + SDOH modules
  ○ Cohort analytics + clinical reporting
  ○ SMS + email notification channels
  ○ Multi-language support

Phase 4 (Year 2):
  ○ Wearable device integration (Apple Health, Google Fit)
  ○ Remote patient monitoring (RPM) billing codes
  ○ Predictive AI alerts (pre-emptive care team outreach)
  ○ White-label platform
  ○ Fine-tuned condition-specific AI models
  ○ Clinical trial recruitment integration
```
