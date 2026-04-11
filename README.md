# Study Habits — AI-Guided Study Skill Builder

An AI-powered web application that helps students build real, lasting study skills through structured behavioral progression. Built on cognitive-behavioral research, it trains one skill at a time with a 3-week deployment cycle — no gamification, no streaks, just measurable habit change.

---

## The Problem

Most students know they need to study better — they just don't know how to change. Generic productivity advice doesn't stick because it ignores the underlying behavioral and cognitive barriers: failure to initiate, poor focus quality, lack of planning, and emotional resistance. This app applies a research-backed framework to systematically close those gaps.

---

## Research Foundation

The system is grounded in the paper *"Developing Study Skills and Cognitive Behavior Using AI: Study Skill Builder Platform"*, which defines:

**Three Dimensions of Study Skills:**
| Dimension | What It Trains |
|-----------|---------------|
| **Behavioral** | Showing up — initiation, task clarity, consistency |
| **Cognitive** | Session quality — focus depth, environment, recovery |
| **Metacognitive** | Planning — sequencing, deadline calibration, reflection |

**Cognitive-Behavioral Model:** perception → emotion → behavior. The AI uses this chain to interpret why a student acts the way they do, not just what they did.

**Growth vs. Fixed Mindset:** Absolute language ("I always procrastinate", "I can't focus") is detected and reframed using the student's own check-in data. The AI never lectures — it uses behavioral evidence to challenge fixed-mindset framing.

---

## How It Works

### 1. Onboarding
Student sets their study goal, identifies their biggest challenges (multi-select + free text), and enters the system.

### 2. Observation Phase (~7 days)
No skill training yet. The student does daily check-ins to establish a behavioral baseline. After 5+ check-ins, they can advance to skill training. The AI observes and patterns — procrastination patterns, focus correlations, miss reasons — are computed and fed into every AI conversation.

### 3. Skill Training
Students work through 8 skills across 4 tiers. Each skill follows a **3-week deployment cycle**:
- **Week 1 — Stabilize:** Build the habit at a fixed time, place, and action
- **Week 2 — Express:** Adapt the skill to fit real-world schedule variation
- **Week 3 — Probe:** Stress-test and generalize the skill under pressure

A skill advances when it reaches a **stability score ≥ 0.70** — computed from check-in data (initiation rate, focus rate, atypical day handling). Brief sessions (under 15 min) count as 0.5 toward focus rate, because the hardest behavioral act is starting.

### 4. Skill Progression Tree
Skills unlock in dependency order:

```
Tier 1: Task Clarity ──→ Initiation
              ↓                ↓
Tier 2: Focus Containment ──→ Environment Control
              ↓                        ↓
Tier 3: Focus Endurance ──→ Cognitive Recovery
              ↓                      ↓
Tier 4: Planning & Sequencing ──→ Deadline Calibration
```

### 5. AI Coaching (DCS v2 — Multi-Agent Pipeline)
The chat runs a **Distributed Cognitive Scaffolding (DCS)** pipeline before each response:

1. **Sentinel agents** (rule-based, no LLM) extract behavioral, cognitive, and metacognitive signals from check-in data
2. **Dimension coaches** (3× llama-3.1-8b-instant in parallel) produce internal specialist notes — never shown to student
3. **InterventionOrchestrator** (llama-3.3-70b-versatile, streaming) synthesises all signals into one calibrated response

The orchestrator receives the student's full context before every message:
- Current phase and skill
- Last 14 check-ins (with focus level, methods, miss reasons, session intentions)
- Procrastination pattern analysis (repeated miss reasons flagged)
- Dimension profile (Behavioral / Cognitive / Metacognitive scores)
- Upcoming events and deadlines
- Study method → focus correlations (e.g. `qa: 3/4 focused`)
- **Knowledge profile** — subjects and topics the student struggled with or mastered across all past sessions
- **Coaching preferences** — style (direct/Socratic), motivation frame, phone screen time

---

## Features

### Core
- **Daily Check-in** (< 2 min) — session type (full / brief / no), focus level, energy, mood, study methods, miss reason, pre-session intention
- **Skill Tree** — visual tier-based graph with SVG dependency lines, color-coded status, stability bars
- **Skill Detail** — training timeline, stats, user-defined task (time + place + action), growth narrative
- **AI Chat** — three-mode DCS pipeline:
  - *Skills Coach* (default) — habit coaching, check-in review, planning; AI can update your skill task directly
  - *Study* — direct subject-matter answers with tool recommendations
  - *Training* — Socratic exam prep, never gives answers
  - Voice-to-text input, AI autocomplete suggestions (Tab to accept)
- **AI Tools** — curated study tools page (StudyFetch, NotebookLM, Napkin, Consensus, Magic School) with dimension-aware highlights
- **Event Tracking** — exams, deadlines, projects with days-until countdown
- **Check-in History** — full log with filtering

### Dashboard
- **Phase banner** — shows current phase and day count
- **Active Plan Card** — skill, week phase, challenge summary, recovery tip
- **Skill Radar Chart** — visual skill status across all 8 skills
- **Dimension Profile Card** — Behavioral / Cognitive / Metacognitive progress bars with expandable explanations
- **Weekly Trend Chart** — 14-day check-in heatmap
- **Today's Note** — AI-generated daily inspiration + personal affirmation field
- **Check-in Widget** — quick status and 14-day calendar dots
- **Assessment Widget** — periodic self-assessment prompt
- **Mini Chat Widget** — quick AI access from dashboard

### Notifications
- **Daily notifications** — AI-generated personalized motivation sent at 8am via cron
- **Weekly insights** — richer cognitive-behavioral analysis every 7 days covering dimension progress, procrastination patterns, and one actionable recommendation
- **Push notifications** — PWA web push to phone (Android Chrome + iOS Safari 16.4+ via Home Screen)

### PWA
- Installable on iOS and Android as a standalone app
- Service worker for push notification delivery
- Tap notifications to open the app directly

### Personalization
- **Banner photo** — custom dashboard banner with drag-to-reposition (Pointer Events API, works on touch)
- **Accent color** — full theme customization (applied to chat bubbles and UI accents)
- **Arabic / English** toggle with RTL support, persisted in localStorage
- **Coaching preferences** — style (direct/Socratic), motivation frame (intrinsic/exam), phone screen time; all fed to AI context

### Admin & Communication
- **Feedback system** — users can submit feedback from the sidebar; admin views all submissions at `/admin/feedback`
- **Cron endpoint** — POST `/api/notifications/generate` (secured with CRON_SECRET) for daily/weekly notification generation

---

## AI Behavior Design

The system prompt enforces strict behavioral guidelines:

- **Never moralizes** — missed sessions are data, not failure
- **Mindset detection** — detects "I always fail", "I can't help it", "nothing works" → reframes once using the student's own check-in evidence
- **Procrastination interpretation** — emotional miss reasons (overwhelmed, not in mood) = cognitive structure signal; logistical reasons = scheduling friction
- **Dimension-aware advice** — behavioral weak → initiation framing; cognitive weak → session quality; metacognitive locked → no planning-level advice
- **Brief session reinforcement** — a 7-minute session that started counts as a behavioral win, especially in Tier 1
- **One recommendation at a time** — never floods with advice
- **Context overrides** — atypical days marked by user; AI adjusts without penalizing

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | PostgreSQL (Railway) + Prisma ORM |
| Auth | NextAuth.js v4 — JWT + Credentials (bcryptjs) |
| AI | Groq API — Llama 3.3 70B Versatile |
| Email | Resend (password reset; requires verified domain in production) |
| UI | Tailwind CSS + shadcn/ui components |
| Charts | Recharts (lazy-loaded via next/dynamic) |
| Push | Web Push API + web-push (VAPID) |
| Deployment | Railway (Node.js + PostgreSQL) + Cloudflare Worker (reverse proxy) |
| Domain | studyskillsbuilder.com (Cloudflare DNS + Worker routing to Railway) |
| Cron | Railway cron service calling `/api/notifications/generate` daily at 8am |

---

## Database Schema

Key models:

| Model | Purpose |
|-------|---------|
| `User` | Auth identity |
| `UserProfile` | Goals, challenges, theme, banner, onboarding state |
| `ActivePhase` | Current phase (observation / skill_training) + start date |
| `Skill` | 8 skills with tier, dimension, slug, dependencies |
| `SkillProgress` | Per-user skill status, stability score, week phase, user task, completion narrative |
| `CheckIn` | Daily check-in data — initiated, focus, energy, mood, methods, miss reason, session intention |
| `ChatMessage` | AI conversation history |
| `Event` | Upcoming exams/deadlines |
| `Notification` | Daily and weekly AI-generated notifications |
| `PushSubscription` | Web push endpoint + VAPID keys per device |
| `Feedback` | User-submitted feedback messages |
| `KnowledgeEntry` | Persistent subject/topic knowledge profile (struggling / improving / strong) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Railway or local) — or use local SQLite for dev

### Local Setup

```bash
git clone https://github.com/EngHlaa46/study-habits.git
cd study-habits
npm install
```

Create `.env`:

```env
# Local dev uses SQLite
DATABASE_URL="file:./prisma/dev.db"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-string"
GROQ_API_KEY="your-groq-api-key"
RESEND_API_KEY="your-resend-api-key"   # optional locally
CRON_SECRET="any-secret-string"

# PWA push notifications (optional locally)
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:you@email.com"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."     # same as VAPID_PUBLIC_KEY
```

First-time setup (push SQLite schema + seed 8 skills):

```bash
npm run db:setup
```

Start dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Generating VAPID Keys (for push notifications)

```bash
npx web-push generate-vapid-keys
```

Add both values to your `.env` and Railway environment variables.

### Production (Railway)

The app is deployed on Railway with a PostgreSQL database. Traffic is routed through a Cloudflare Worker to the Railway service URL, exposing it at **studyskillsbuilder.com**.

**Railway environment variables:**

```env
DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/railway"
NEXTAUTH_URL="https://studyskillsbuilder.com"
NEXTAUTH_SECRET="..."
GROQ_API_KEY="..."
RESEND_API_KEY="..."
CRON_SECRET="..."
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:you@email.com"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
```

**Push schema to Railway** (run after any schema change, using the public proxy URL):

```bash
DATABASE_URL='postgresql://postgres:password@centerbeam.proxy.rlwy.net:33356/railway' npx prisma db push --schema=prisma/schema.prisma
```

**Daily cron** — handled by a Railway cron service (`cron/Dockerfile`) that runs at 8am and calls:
```
POST https://studyskillsbuilder.com/api/notifications/generate
x-cron-secret: <CRON_SECRET>
```

---

## Project Structure

```
prisma/
  schema.prisma          — PostgreSQL schema (production/Supabase)
  schema.dev.prisma      — SQLite schema (local dev)
  seed.ts                — 8 skills with tiers, dimensions, dependency edges

public/
  manifest.json          — PWA manifest (installable app)
  sw.js                  — Service worker (handles push events + notification clicks)

src/
  app/
    (auth)/              — login, register, forgot-password, reset-password
    (app)/               — authenticated pages:
      dashboard/         — main dashboard
      check-in/          — daily check-in flow
      skills/            — skill tree + skill detail pages
      chat/              — full AI chat
      events/            — exam/deadline tracker
      history/           — check-in history log
      settings/          — theme, accent color, account settings
      onboarding/        — first-time setup flow
    admin/
      feedback/          — admin-only feedback viewer
    api/                 — all route handlers
  components/
    dashboard/           — all dashboard widgets
    skills/              — skill tree and detail components
    check-in/            — check-in form
    chat/                — ChatInterface (modes, voice, autocomplete, tool call toasts)
    layout/              — sidebar, notification bell, feedback button
    providers/           — session, theme, push, language providers
    ui/                  — shadcn/ui primitives
  lib/
    ai/
      systemPrompt.ts    — single source of truth for all AI behavior rules
      buildContext.ts    — assembles full student state before each AI call
      dcs/
        pipeline.ts      — DCS pipeline (sentinels → coaches → orchestrator → tool calls)
        sentinels.ts     — rule-based signal extraction (no LLM)
        coaches.ts       — parallel dimension coach LLM calls
        knowledgeAnalyzer.ts — fire-and-forget knowledge profile updater
        types.ts         — shared signal and output types
    skills/
      progression.ts     — stability score formula and unlock thresholds
    auth.ts              — NextAuth configuration
    db/prisma.ts         — Prisma client singleton
    language.tsx         — Arabic/English context with RTL support
    session.ts           — session helpers
```

---

## Dual Schema Setup

The project maintains two Prisma schemas:

| Schema | Provider | Used by |
|--------|----------|---------|
| `prisma/schema.dev.prisma` | SQLite | `npm run dev` (local) |
| `prisma/schema.prisma` | PostgreSQL | Railway build + Railway PostgreSQL |

This allows local development without a cloud database while keeping production on PostgreSQL.

---

## Reference Documents

These files live outside the repo at `/home/milkyway/Study habit refirement system/` and should be kept in sync with the codebase:

| File | Purpose | Editable |
|------|---------|---------|
| `SSB_Features_Roadmap.md` | Feature roadmap — v1 live, v2 DCS shipped, post-hack backlog | Yes (Markdown) |
| `SSB_Features_Roadmap.docx` | Original Word version of the roadmap | No (binary) |
| `ssb-map.html` | English mind map of the full system | Yes (HTML) |
| `ssb-map-ar.html` | Arabic mind map of the full system | Yes (HTML) |
| `SSB.pdf` | Research paper the system is based on | No (binary) |
| `Requirements.md` | Original requirements document | Yes (Markdown) |
| `System Prompt.md` | Reference system prompt draft | Yes (Markdown) |

When updating features, keep `SSB_Features_Roadmap.md` and `EDITS.md` in sync.

---

## License

MIT
