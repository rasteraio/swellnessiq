# Rastera Health

> Patient-centric digital health platform for post-discharge recovery

Rastera reduces 30-day hospital readmissions through AI-driven adaptive microlearning, personalized content delivery, and continuous engagement — helping patients manage their recovery at home.

---

## Architecture Overview

```
apps/
├── api/          Node.js + Express + TypeScript backend
│   ├── prisma/   PostgreSQL schema (Prisma ORM)
│   └── src/
│       ├── routes/           REST API endpoints
│       ├── services/         Business logic
│       │   ├── learningPlanEngine.ts    Adaptive module scheduling
│       │   ├── aiRecommendationEngine.ts  Claude-powered AI
│       │   ├── chatService.ts            Patient Q&A assistant
│       │   ├── engagementService.ts      Engagement tracking
│       │   └── notificationService.ts    Multi-channel notifications
│       ├── middleware/       Auth, audit logging, error handling
│       └── jobs/             Cron scheduler
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
npm run db:seed       # Seed with sample data
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
| Admin | admin@rastera.health | Admin123! |
| Care Coordinator | coordinator@rastera.health | Coord123! |
| Patient | patient@rastera.health | Patient123! |

---

## Key Features

### Patient Experience
- **Adaptive microlearning** — 5-minute modules timed to post-discharge milestones (Day 2, 5, 7, 10...)
- **AI-powered chat** — RasteraAssist provides safe, non-diagnostic health education guidance
- **Vital monitoring** — Log weight, BP, O2 sat, heart rate with automatic abnormal detection
- **Progress tracking** — Visual dashboard showing completion rate, upcoming modules, streaks
- **Accessible UI** — Large text, high contrast, captions, simplified language modes

### Adaptive Learning Engine
- **Score-based branching** — Poor quiz performance (<60%) triggers reinforcement modules
- **Engagement-driven adaptation** — Declining engagement unlocks AI-curated intervention content
- **Condition branching** — New comorbidities inject relevant modules automatically
- **Reinforcement cycles** — Modules repeat at defined intervals (default: 14 days)
- **Timeline scheduling** — All modules are date-stamped to the patient's discharge date

### AI Integration (Claude)
- **Recommendations** — `claude-opus-4-6` analyzes patient profile to recommend optimal next modules
- **Risk scoring** — Computes 30-day readmission risk (0–100) using behavioral + clinical signals
- **Chat assistant** — Guardrailed Q&A with emergency escalation detection
- **Content simplification** — Rewrites content at 6th-grade reading level for accessibility
- **Nudges** — `claude-haiku-4-5` generates personalized engagement messages
- **Prompt caching** — System prompts cached for cost/latency efficiency

### Care Team Portal
- Patient roster sorted by risk score
- Real-time alerts (abnormal vitals, engagement drops, urgent chat messages)
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
