# Study Habits

AI-guided web app that helps students build real study skills through a structured progression system. One skill at a time, one habit that sticks — no streaks, no points, just progress.

## How It Works

1. **Onboarding** — Set your study goals and pick your biggest challenges
2. **Observation Phase** — 7 days of daily check-ins to establish your baseline
3. **Skill Training** — Work through 8 skills across 4 tiers in a 3-week cycle per skill:
   - **Week 1: Stabilize** — Build consistency with a specific time/place/action routine
   - **Week 2: Express** — Adapt the skill to fit your real schedule
   - **Week 3: Probe** — Stress-test and generalize the skill
4. **AI Coaching** — Chat with an AI coach that sees your full context and gives personalized guidance

## Features

- **Dashboard** with weekly trend charts, current progress, and plan card
- **Daily Check-in** (< 2 min) tracking focus, energy, mood, miss reasons, and study methods
- **Skill Tree** — visual tier-based tree with dependency graph and color-coded progression
- **AI Chat** powered by Groq (Llama 3.3 70B) with full context awareness
- **Event Tracking** for exams, deadlines, and projects
- **Check-in History** with detailed logs
- **Password Reset** via email
- **Arabic / English** language toggle with RTL support

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** PostgreSQL (Supabase) + Prisma ORM
- **Auth:** NextAuth.js v4 (JWT + Credentials, bcryptjs)
- **AI:** Groq API (Llama 3.3 70B)
- **Email:** Resend (optional locally — falls back to console)
- **UI:** Tailwind CSS + shadcn/ui + Recharts
- **Deployment:** Render + Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (PostgreSQL) **or** use local SQLite for dev

### Setup

```bash
git clone https://github.com/HlaaDukhan/study-habits.git
cd study-habits
npm install
```

Create a `.env` file:

```env
# Local dev (SQLite)
DATABASE_URL="file:./prisma/dev.db"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
GROQ_API_KEY="your-groq-api-key"
RESEND_API_KEY="your-resend-api-key"   # optional locally
```

First-time local setup (push schema + seed skills):

```bash
npm run db:setup
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production (Render + Supabase)

Set these environment variables in Render:

```env
DATABASE_URL="postgresql://..."   # Supabase Transaction pooler (port 6543, ?pgbouncer=true)
NEXTAUTH_URL="https://your-render-app.onrender.com"
NEXTAUTH_SECRET="..."
GROQ_API_KEY="..."
RESEND_API_KEY="..."
```

Push schema to Supabase before first deploy:

```bash
npx prisma db push --schema=prisma/schema.prisma
```

## Project Structure

```
prisma/
  schema.prisma          — PostgreSQL schema (production)
  schema.dev.prisma      — SQLite schema (local dev)
  seed.ts                — 8 skills + dependency edges

src/
  app/
    (auth)/              — login, register, forgot/reset password
    (app)/               — authenticated pages (dashboard, check-in, skills, chat, events, history, settings, onboarding)
    api/                 — route handlers
  components/            — React components organized by feature
  lib/
    ai/                  — system prompt + context builder
    db/                  — Prisma client singleton
    skills/              — progression logic and thresholds
```

## License

MIT
