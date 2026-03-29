# Study Habit Refinement System — Developer Reference

## Project Overview
AI-guided web app that helps students improve study efficiency by refining one core habit through skill-based progression. One habit, one skill at a time. No gamification. No prescriptive habits.

## Tech Stack
- **Next.js 14** (App Router, TypeScript)
- **Prisma ORM** with **SQLite** (`prisma/dev.db`) for local dev, **PostgreSQL** (Supabase) for production
- **NextAuth.js v4** — email/password auth (bcryptjs hashing)
- **Groq API** (llama-3.3-70b-versatile) for AI chat — NOT Anthropic
- **Resend** for transactional email (password reset). Requires `RESEND_API_KEY`. Falls back to console.log locally when key is missing.
- **Tailwind CSS + shadcn/ui** for styling (dark theme only, `#0d0d14` bg)
- **Recharts** for data visualization (dashboard weekly trend — lazy-loaded via next/dynamic)
- **Deployment:** Render (Node.js server) + Supabase (PostgreSQL)

## Environment Variables (`.env`)
```
# Local dev — SQLite
DATABASE_URL="file:./prisma/dev.db"

# Production — Supabase Transaction pooler (port 6543, pgbouncer=true required for serverless)
# DATABASE_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GROQ_API_KEY="..."
RESEND_API_KEY="..."   # optional locally — resets logged to console if missing
```

## Directory Structure
```
prisma/
  schema.prisma        — PostgreSQL schema (production/Supabase)
  schema.dev.prisma    — SQLite schema (local dev)
  seed.ts              — 8 skills + 10 dependency edges
  dev.db               — local SQLite file (gitignored)

src/
  app/
    (auth)/            — login, register, forgot-password, reset-password pages
    (app)/             — authenticated pages (dashboard, check-in, skills, chat, events, history, settings, onboarding)
    api/               — route handlers (auth, register, check-in, skills, chat, onboarding, progression, events, forgot-password, reset-password)
  lib/
    ai/
      systemPrompt.ts  — single source of truth for AI behavior
      buildContext.ts  — assembles full user state before each AI call (includes study methods + focus correlation)
    skills/
      progression.ts   — skill unlock thresholds and rules
    auth.ts            — NextAuth config (emails normalized to lowercase)
    db/prisma.ts       — Prisma client singleton (global reuse in both dev and prod)
    email.ts           — Resend email sender (password reset)
    language.tsx       — LanguageContext for Arabic/English toggle with RTL support
    session.ts         — session helpers
  components/          — React components organized by feature
```

## Key Concepts
- **One habit, one skill at a time** — user maintains "I show up to study"; quality is improved by training one skill
- **8 skills across 4 tiers** with explicit dependency chain (seeded):
  - Tier 1: Task Clarity, Initiation
  - Tier 2: Focus Containment, Environment Control
  - Tier 3: Focus Endurance, Cognitive Recovery
  - Tier 4: Planning & Sequencing, Deadline Calibration
- **Skill unlock** — requires prerequisite to reach "stable" (3-week cycle + stability score ≥ 0.7). Based on check-in patterns, not a timer.
- **Observation phase** (~7 days, 5+ check-ins required before advancing) — no skill training yet
- **3-week skill deployment cycle**: Stabilize → Express → Probe
- **User defines their own tasks** (time/place/action) — AI assists, never overrides
- **Daily check-in < 2 minutes** — supports skipped days and backfilling (2–3 days)
- **Context overrides** — user can mark data as atypical; AI adjusts interpretation, never downgrades skill
- **Rolling events model** — academic events (exam/quiz/deadline) are checkpoints anchoring timelines, not endpoints
- **Study methods tracker** — check-in captures which methods were used (explain, Q&A, mindmap, notes, record, read); AI receives per-method focus correlation
- **Language toggle** — Arabic/English with RTL support; preference persisted in localStorage

## AI Behavior Rules (enforced in systemPrompt.ts)
- Never moralizes, never judges missed sessions
- Never removes control from the user
- Treats motivation issues, subject aversion, overload as data — not failure
- Interprets behavior with user-provided context
- Recommends one skill at a time based on observed patterns

## Commands
```bash
# Local dev (SQLite)
npm run dev              # generates sqlite client + starts dev server
npm run db:setup         # first-time setup: push schema + seed skills (SQLite)

# Production schema push (run once when schema changes, with Supabase DATABASE_URL active in .env)
npx prisma db push --schema=prisma/schema.prisma

# Build
npm run build            # generates pg client + builds
```

## Local vs Production Schema
- `prisma/schema.dev.prisma` → SQLite, used by `npm run dev` and `npm run db:setup`
- `prisma/schema.prisma` → PostgreSQL, used by Render build
- To push schema changes to Supabase: temporarily swap DATABASE_URL in `.env` to Supabase connection string, run `npx prisma db push --schema=prisma/schema.prisma`, then swap back

## Important Rules
- Dark theme only (`#0d0d14` background, `#38bdf8` cyan accent, `#4ade80` green, `#fbbf24` amber, `#a855f7` purple, `#f97316` orange)
- No XP, no streaks, no gamification scores
- Daily check-in must complete in < 2 minutes
- System prompt in `src/lib/ai/systemPrompt.ts` is the single source of truth for AI behavior
- Skill progression thresholds are in `src/lib/skills/progression.ts`
- All emails normalized to lowercase on register, login, and forgot-password
- Never commit `.env`, `prisma/dev.db`, or any `*.db` files

## What Is NOT Yet Implemented
- Phone usage data integration (FR-10) — schema has `phoneDataConsent` field, UI not built
- Voice notes in check-in
- Minimum 5–7 day event distance enforcement (events page exists, validation not enforced)
- Brevo email (currently using Resend — only works with verified domain, not arbitrary emails)
- AI proactively surfacing bad habits during observation (waits for user to ask)
- Motivation & Stories section
