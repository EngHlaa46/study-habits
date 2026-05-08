# Study Skills Builder — AI-Driven Mastery Platform

An AI-powered study platform that builds a personalised skill tree from your actual course material, then assesses mastery through targeted activities — no generic advice, no self-report bias.

Live at **[studyskillsbuilder.com](https://studyskillsbuilder.com)**

---

## What It Does

1. **You describe your subject** — paste a course outline, upload a PDF/syllabus, or type a subject name
2. **The SkillTreeAgent reads it** and maps the path from novice to genuine mastery: what experts can *do*, explain, and perceive that beginners cannot — specific to your material
3. **The AssessmentAgent evaluates you** — not a quiz bank, but the right format for each node: recall games, debugging tasks, novel problems, explanation prompts, analogy challenges
4. **The system tracks mastery objectively** — no "rate your focus 1–5", just what you can and can't do yet
5. **Spaced repetition runs automatically** — due nodes surface, weak areas get targeted, the tree grows more granular where you're stuck

---

## Architecture: Two-Layer Model

### Layer 1 — Curriculum (SkillTreeAgent)
Reads your uploaded material or course outline and derives a skill tree unique to that content. Structure (node count, depth, relationships) emerges entirely from the material — no preset template. Each node describes:
- What this skill is and why it matters on the path to mastery
- What a master can **do** that a beginner cannot (specific and observable)
- Prerequisite nodes that must be mastered first
- The right evaluation format for this type of knowledge

Root nodes (no prerequisites) activate immediately. Locked nodes unlock as their prerequisites are mastered.

### Layer 2 — Assessment (EvaluationAgent)
Receives the current skill node and generates an appropriate evaluation activity. Format is matched to what the node's mastery description requires:

| Format | When used |
|--------|-----------|
| `recall_quiz` | Definitions, terminology, factual recall |
| `matching_game` | Associations, vocabulary, symbol-meaning pairs |
| `problem_solving` | Applying rules to solve problems (math, logic) |
| `code_debugging` | Finding/fixing errors in code or logic |
| `explanation_prompt` | Conceptual depth — "explain why…", "teach this to a beginner" |
| `analogy_task` | Abstract understanding — "how is X like Y in another domain?" |
| `creative_challenge` | Generative, open-ended application |

---

## Onboarding Flow

**Step 0 — Subject & Outline**
- Enter a subject name (min. 3 characters — validated by a fast LLM before the main agent runs)
- Paste your course outline or syllabus (recommended — gives the agent the best signal)
- Or upload a PDF/txt/md — the system auto-extracts the outline from the file, which you can review and edit
- The SkillTreeAgent (~20s) builds your personalised skill tree and generates 4 material-specific study goal options

**Steps 1–4** — study goal, challenges, preferred study time, upcoming events

**Returning users** — if you log in with no skill tree (e.g. after a reset), you go straight to step 0 only. After adding a subject you return to the dashboard — no need to redo steps 1–4.

---

## AI Coaching Pipeline (DCS)

The chat uses a **Distributed Cognitive Scaffolding** pipeline before each response:

1. **Sentinel agents** (rule-based, no LLM) — extract behavioral signals from check-in data
2. **Dimension coaches** (3× llama-3.1-8b-instant in parallel) — produce internal specialist notes, never shown to the student
3. **InterventionOrchestrator** (llama-3.3-70b-versatile, streaming) — synthesises all signals into one calibrated, non-moralising response

**Three chat modes:**
- *Skills Coach* (default) — habit coaching, check-in review, task planning; AI can update your skill task directly via tool call
- *Study* — direct subject-matter answers with tool recommendations
- *Training* — Socratic exam prep, never gives answers

**Context fed to the AI per message:**
- Active skill trees and node mastery scores
- Last 14 check-ins (focus, methods, intentions, miss reasons)
- Upcoming events and deadlines
- Study method → focus correlations
- Knowledge profile (subjects/topics where you're struggling or strong)
- Coaching preferences (style, motivation frame, phone screen time)

---

## Features

### Core
- **Subject skill tree** — AI-generated from your own material; nodes show mastery status, prerequisites, and what mastery looks like
- **Assessment sessions** — activity format matched to skill node type; confidence calibration before answering
- **Daily check-in** (< 2 min) — session type, focus level, methods used, miss reason, pre-session intention
- **Spaced repetition** — nodes track `lastPracticedAt`, `nextReviewAt`, `reviewInterval`; interval adjusts by mastery score
- **AI chat** — three-mode DCS pipeline with voice input, autocomplete, and tool calling
- **Event tracking** — exams, deadlines, projects with days-until countdown

### Games
Low-pressure mini-games that reinforce mastery without self-report or session tracking. Results feed directly into `SkillNode.masteryScore` and `SkillProgress.stabilityScore`.

| Game | Mechanic | Accent |
|------|----------|--------|
| **Knowledge Quiz** | Adaptive MCQ grounded in your uploaded material. Difficulty scales with Bloom's taxonomy per node (Recognition → Comprehension → Application → Analysis → Synthesis). Mastered nodes appear as retention checks — wrong answers register a mastery slip. | Purple |
| **Memory Sprint** | Flash a concept card for 12s, then recall it in text. AI scores recall quality and updates mastery. | Cyan |
| **Task Breakdown** | AI gives a vague study goal drawn from your actual skills. You decompose it into steps with time estimates. Scored on specificity, realism, and coverage — nudges planning skill stability. | Green |

**Materials → Quiz pipeline:** Every uploaded PDF/file is stored as source material. Hitting **Quiz** on any material card routes directly to a Knowledge Quiz grounded in that file's exact terminology and examples — not generic textbook questions.

**Coach Challenges:** The AI coach can assign targeted game instances from chat (e.g. *"I've set up a Memory Sprint on Fourier transforms in your Games section"*). Challenges appear on the Games page with difficulty, due date, and a Play button.

### Dashboard
- **Plan widget** — all your skill trees with mastery progress bars and due/active nodes
- **Check-in widget** — 14-day calendar dots + quick status
- **Assessment widget** — surfaces next queued activity
- **Events card** — upcoming deadlines
- **Weekly trend chart** — 14-day check-in heatmap
- **Inspiration widget** — AI-generated daily focus message

### Notifications
- **Daily** — AI-generated personalised motivation at 8am via Railway cron
- **Weekly insights** — cognitive-behavioral analysis every Sunday
- **Push notifications** — Web Push to phone (Android Chrome + iOS Safari 16.4+ via Home Screen)

### PWA
- Installable on iOS and Android as a standalone app
- Service worker for push notification delivery

### Personalization
- **Banner photo** — custom dashboard banner with drag-to-reposition
- **Accent color** — full theme customization
- **Arabic / English** toggle with RTL support
- **Coaching preferences** — style (direct/Socratic), motivation frame, phone screen time

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | PostgreSQL (Railway) + Prisma ORM |
| Auth | NextAuth.js v4 — JWT + Credentials (bcryptjs) |
| AI | Groq API — Llama 3.3 70B (SkillTreeAgent) + Llama 3.1 8B (validation, goal gen, outline extraction) |
| Email | Resend (password reset) |
| UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts (lazy-loaded) |
| Push | Web Push API + web-push (VAPID) |
| Deployment | Railway (Node.js + PostgreSQL) + Cloudflare Worker (reverse proxy) |
| Domain | studyskillsbuilder.com |
| Cron | Railway cron service → `POST /api/notifications/generate` daily at 8am |

---

## Database Schema

| Model | Purpose |
|-------|---------|
| `User` | Auth identity |
| `UserProfile` | Goals, challenges, theme, banner, onboarding state |
| `ActivePhase` | Current phase + start date |
| `SkillTree` | AI-generated skill tree per material upload |
| `SkillNode` | Individual node with mastery status, score, spaced repetition fields |
| `QueuedActivity` | Pre-built assessment activities awaiting the student |
| `AssessmentSession` | Completed activity: student response, mastery delta, calibration score |
| `WeeklyInsight` | Weekly AI summary: nodes mastered, weakest concept, narrative |
| `CheckIn` | Daily check-in data |
| `ChatMessage` | AI conversation history |
| `Event` | Upcoming exams/deadlines |
| `Notification` | AI-generated push notifications |
| `PushSubscription` | Web push endpoint per device |
| `KnowledgeEntry` | Persistent subject/topic knowledge profile |
| `Feedback` | User-submitted feedback |
| `GameChallenge` | Coach-assigned or self-started game instance (gameType, difficulty, dueBy, status) |
| `GameSession` | Completed game result: score, duration, per-node deltas, detailsJson |
| `MaterialSource` | Raw markdown content of uploaded files, used to ground quiz questions |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (Railway) or local SQLite for dev

### Local Setup

```bash
git clone https://github.com/EngHlaa46/study-habits.git
cd study-habits
npm install
```

Create `.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-string"
GROQ_API_KEY="your-groq-api-key"
RESEND_API_KEY="your-resend-api-key"   # optional locally
CRON_SECRET="any-secret-string"
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:you@email.com"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
```

First-time setup:

```bash
npm run db:setup   # push SQLite schema + seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Generating VAPID Keys

```bash
npx web-push generate-vapid-keys
```

### Production (Railway)

Traffic routes through a Cloudflare Worker to Railway, exposed at **studyskillsbuilder.com**.

**Push schema after changes** (using Railway public proxy URL):

```bash
DATABASE_URL='postgresql://postgres:password@centerbeam.proxy.rlwy.net:33356/railway' npx prisma db push --schema=prisma/schema.prisma
```

---

## Project Structure

```
prisma/
  schema.prisma          — PostgreSQL schema (production)
  schema.dev.prisma      — SQLite schema (local dev)

src/
  app/
    (auth)/              — login, register, password reset
    (app)/               — authenticated pages:
      dashboard/         — main dashboard
      onboarding/        — subject + skill tree generation flow
      check-in/          — daily check-in
      skills/            — skill tree view + detail
      chat/              — AI chat (DCS pipeline)
      events/            — exam/deadline tracker
      history/           — check-in log
      settings/          — theme, preferences
    api/
      materials/         — POST: generate skill tree from text/file
        extract-outline/ — POST: extract course outline from uploaded file
      assessment/        — activity generation and submission
      check-in/          — daily check-in submission
      chat/              — streaming AI chat + voice transcription
      games/
        generate/        — POST: generate quiz questions / memory card / task goal
        submit/          — POST: evaluate responses, update mastery, save GameSession
        challenges/      — GET: list PENDING/IN_PROGRESS GameChallenges
        history/         — GET: last 20 GameSessions
      onboarding/        — complete onboarding profile
      notifications/     — push notification generation (cron)
  components/
    games/
      quiz/              — QuizGame, QuizQuestion, QuizResults
      memory-sprint/     — MemorySprintGame, ConceptCard, RecallInput, MemorySprintResults
      task-breakdown/    — TaskBreakdownGame, GoalCard, StepBuilder, TaskBreakdownResults
  lib/
    ai/
      systemPrompt.ts    — single source of truth for AI behavior
      buildContext.ts    — assembles full student state before each AI call
      dcs/
        pipeline.ts      — DCS pipeline (sentinels → coaches → orchestrator)
        skillTreeAgent.ts — SkillTreeAgent, validateMaterial, generateStudyGoals
        knowledgeAnalyzer.ts
      games/
        generateQuiz.ts       — adaptive MCQ with Bloom's taxonomy difficulty bands
        generateMemorySprint.ts
        generateTaskBreakdown.ts
        evaluateRecall.ts
        evaluateTaskBreakdown.ts
    games/
      masteryUpdate.ts   — applyGameMasteryDelta (weight by isRetentionCheck)
      stabilityUpdate.ts — applyPlanningStabilityNudge (Task Breakdown → SkillProgress)
    skills/
      progression.ts     — skill unlock thresholds
```

---

## License

MIT
