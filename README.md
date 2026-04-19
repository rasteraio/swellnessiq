# SwellnessIQ

> Adaptive microlearning platform for post-discharge recovery and hospital readmission reduction

SwellnessIQ reduces 30-day hospital readmissions through AI-driven adaptive microlearning, personalized content delivery, and continuous engagement — targeting the 6 CMS HRRP (Hospital Readmissions Reduction Program) penalized conditions.

**Clinical benchmark:** Coleman Care Transitions Model — 4.4 percentage point reduction in 30-day readmissions.
**Target conditions:** Heart Failure, COPD, Acute MI, CABG, THA/TKA, Pneumonia.

---

## Architecture Overview

```
apps/
├── api/          Node.js + Express + TypeScript backend
│   ├── prisma/   PostgreSQL schema (Prisma ORM)
│   └── src/
│       ├── routes/           REST API endpoints
│       ├── services/         Business logic
│       │   ├── learningPlanEngine.ts    Adaptive module scheduling + clinical protocol
│       │   ├── aiRecommendationEngine.ts  Claude-powered AI recommendations
│       │   ├── chatService.ts            SwellnessIQ Assistant (patient Q&A)
│       │   ├── engagementService.ts      Engagement tracking + escalation
│       │   └── notificationService.ts    Multi-channel notifications
│       ├── middleware/       Auth, audit logging, error handling
│       └── jobs/             Cron scheduler (module unlock, engagement escalation)
│
└── web/          Next.js 14 frontend
    └── src/
        ├── app/
        │   ├── (auth)/       Login / registration
        │   ├── (patient)/    Patient-facing: dashboard, modules, chat, vitals
        │   └── (care-team)/  Care team portal
        ├── components/
        │   ├── patient/      Patient UI components
        │   ├── care-team/    Care team UI components
        │   ├── modules/      Video player, exercise blocks
        │   └── ui/           Shared UI primitives
        └── stores/           Zustand state (auth)

packages/
└── shared/       TypeScript types shared between apps

docs/
└── ARCHITECTURE.md   Full system architecture, DB schema, API routes, AI strategy
```

---

## Clinical Protocol

### Adaptive Tracks
| Track | Criteria | Cadence |
|-------|----------|---------|
| Standard | LACE+ < 10 | Modules every 2-3 days |
| Intensive | LACE+ ≥ 10 | Daily modules Days 1-14 + required caregiver |
| Maintenance | 3 consecutive ≥80% passes | Monthly modules |

### Engagement Escalation
| Threshold | Action |
|-----------|--------|
| 48h no engagement | Automated push notification |
| 72h no engagement | Clinical alert to nurse navigator |
| 96h no engagement | Phone outreach required |
| 3 consecutive failures | Nurse navigator alert (mandatory) |

### Module Structure (Four-Part)
Each module: **Hook** (30s) → **Core Content** (90-120s) → **Application** (30-45s) → **Knowledge Check** (2-3 questions)

**Mastery threshold: 80%** (competency-based medical education standard)

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Anthropic API key

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, JWT_SECRET
```

### 3. Set up database
```bash
npm run db:migrate    # Run Prisma migrations
npm run db:seed       # Seed with 130 SwellnessIQ modules + sample patients
```

### 4. Run development servers
```bash
npm run dev
# API: http://localhost:3001
# Web: http://localhost:3000
```

### Sample accounts (after seed)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@swellnessiq.com | Admin123! |
| Care Coordinator | coordinator@swellnessiq.com | Coord123! |
| Patient (HF, LACE+ 12, Intensive) | patient@swellnessiq.com | Patient123! |

---

## Key Features

### Patient Experience
- **Adaptive microlearning** — 5-minute modules timed to post-discharge milestones (Day 1, 2, 5, 7, 10...)
- **AI-powered chat** — SwellnessIQ Assistant provides safe, non-diagnostic health education guidance
- **Vital monitoring** — Log weight, BP, O2 sat, heart rate with automatic abnormal detection
- **Progress tracking** — Visual dashboard showing completion rate, upcoming modules, streaks
- **Accessible UI** — Large text, high contrast, captions, simplified language modes (4th-grade for SDOH patients)

### Adaptive Learning Engine
- **LACE+ scoring** — ≥10 triggers intensive daily track with required caregiver enrollment
- **80% mastery threshold** — below threshold triggers immediate reinforcement module
- **Engagement escalation** — 48h/72h/96h push → clinical alert → phone outreach protocol
- **Graduation logic** — 3 consecutive ≥80% passes → monthly maintenance mode
- **Polypharmacy track** — ≥5 discharge medications injects medication management modules Days 3-5
- **Mandatory modules** — medication list, warning signs, emergency thresholds are non-skippable
- **Pre-discharge delivery** — welcome and platform orientation modules delivered 24-48h before discharge

### Module Library (130 modules)
| Condition | Count |
|-----------|-------|
| Heart Failure | 20 |
| COPD | 19 |
| Acute MI | 18 |
| CABG | 21 |
| THA/TKA | 18 |
| Pneumonia | 16 |
| Polypharmacy | 10 |
| Social Determinants | 5 |
| Platform Fundamentals | 3 |

### AI Integration (Claude)
- **Recommendations** — `claude-opus-4-6` analyzes patient profile to recommend optimal next modules
- **Risk scoring** — Computes 30-day readmission risk (0–100) using HRRP-weighted behavioral + clinical signals
- **Chat assistant** — Guardrailed Q&A with emergency escalation detection (condition-specific warning signs)
- **Content simplification** — Rewrites content at 6th-grade (4th-grade for SDOH) reading level
- **Nudges** — `claude-haiku-4-5` generates personalized SMS/push engagement messages
- **Prompt caching** — System prompts cached for cost/latency efficiency

### Care Team Portal
- Patient roster sorted by risk score + LACE+ tier
- Real-time alerts: abnormal vitals, engagement drops, consecutive failures, emergency bypass
- Nurse navigator alerts at 72h no-engagement and 3 consecutive failures
- Secure messaging with patients
- Cohort analytics dashboard
- HIPAA-compliant audit trail

---

## HIPAA Compliance

- All PHI access logged in `audit_logs` table
- JWT tokens with 15-minute expiry + server-side session revocation
- Passwords hashed with bcrypt (cost 12)
- Role-based access control enforced at API middleware level
- TLS 1.3 required for all connections
- Database in private subnet with no public access
- BAA required with Anthropic, cloud provider, SMS/email vendors before production

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache | Redis |
| AI | Anthropic Claude (Opus 4.6 + Haiku 4.5) |
| Auth | JWT (access/refresh) + bcrypt |
| Scheduling | node-cron |
| Logging | Winston |
| Monorepo | npm workspaces |

---

## Deployment (Production Checklist)

- [ ] PostgreSQL with encryption at rest (AWS RDS / Aurora)
- [ ] Redis with AUTH + TLS (AWS ElastiCache)
- [ ] Containers: Docker + ECS/Kubernetes
- [ ] Load balancer with TLS termination
- [ ] CDN for static assets + video (CloudFront)
- [ ] BAA signed with Anthropic + AWS
- [ ] Secrets in AWS Secrets Manager / HashiCorp Vault
- [ ] CloudWatch / Datadog monitoring + alerting
- [ ] Automated DB backups with PITR
- [ ] Penetration testing before go-live
- [ ] FHIR R4 / SMART on FHIR EHR integration (Epic, Cerner) — Phase 2
- [ ] Validic RPM integration (CPT 99453/99454/99457/99458) — Phase 3

---

## Documentation

See `docs/ARCHITECTURE.md` for:
- Full system architecture diagram
- Adaptive learning flow (pseudo-code)
- Database schema relationships
- Complete API route reference
- AI integration strategy
- HIPAA compliance architecture
- EHR/FHIR integration plan
- Monetization model
- MVP vs roadmap
