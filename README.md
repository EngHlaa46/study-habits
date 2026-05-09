# Study Skills Builder — AI-Driven Mastery Platform

An AI-powered study platform that builds a personalised skill tree from your actual course material, then assesses mastery through targeted activities — no generic advice, no self-report bias.

Live at **[studyskillsbuilder.com](https://studyskillsbuilder.com)**

---

## What It Does

1. **You describe your subject** — paste a course outline, upload a PDF/syllabus, or type a subject name
2. **The SkillTreeAgent reads it** and maps the path from novice to genuine mastery: what experts can *do*, explain, and perceive that beginners cannot — specific to your material
3. **The AssessmentAgent evaluates you** — not a quiz bank, but the right format for each node: recall games, debugging tasks, novel problems, explanation prompts, analogy challenges
4. **The system tracks mastery objectively** — no self-rating, just what you can and can't do yet
5. **Spaced repetition runs automatically** — due nodes surface, weak areas get targeted, the tree grows more granular where you're stuck
6. **Play to reinforce** — five adaptive mini-games (Quiz, Scenario, Speed Round, Memory Sprint, Task Breakdown) update mastery scores; the AI coach silently assigns targeted challenges when weak areas are detected; a pixel-art palm grows as you earn XP

---

## Architecture: Three-Agent Model

### Agent 1 — Curriculum (SkillTreeAgent)
Reads your uploaded material or course outline and derives a skill tree unique to that content. Structure (node count, depth, relationships) emerges entirely from the material — no preset template. Each node describes:
- What this skill is and why it matters on the path to mastery
- What a master can **do** that a beginner cannot (specific and observable)
- Prerequisite nodes that must be mastered first
- The right evaluation format for this type of knowledge

Root nodes (no prerequisites) activate immediately. Locked nodes unlock as their prerequisites are mastered.

### Agent 2 — Assessment (EvaluationAgent)
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

### Agent 3 — Quiz Generation (QuizGenerationAgent)
Dedicated agent for generating game quiz questions. Operates independently from the assessment pipeline — it reads both the student's weakness profile and the original uploaded material before generating a single question:

1. **Weakness targeting** — fetches up to 7 active nodes sorted weakest-first (lowest `masteryScore`) for active-learning questions, plus up to 3 mastered nodes sorted by oldest `lastPracticedAt` as retention checks
2. **Material grounding** — fetches the raw `MaterialSource` content (up to 8,000 chars) for the skill tree; every question must reference specific terminology, examples, and facts from the file — no generic textbook questions
3. **Bloom's taxonomy difficulty bands** — maps each node's exact mastery score to the right cognitive level:

| Mastery | Band |
|---------|------|
| < 30% | Recognition — "What is X?" |
| 30–55% | Comprehension — "How does X work?" |
| 55–75% | Application — "When would you use X?" |
| 75–90% | Analysis — "Why does X produce this result?" |
| 90%+ | Synthesis/Probe — "In which case would X NOT apply?" |
| Retention check | Analysis — confirms mastered knowledge still holds |

4. **Per-option wrong-answer explanations** — each distractor gets a one-sentence explanation naming the specific misconception it represents, not just "this is wrong"

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

1. **Sentinel agents** (rule-based, no LLM) — extract behavioral signals from mastery and session data; detect fixed-mindset language patterns
2. **Dimension coaches** (3× llama-3.1-8b-instant in parallel) — produce internal specialist notes, never shown to the student
3. **AnalysisAgent** — evaluates assessment responses, computes mastery delta and calibration accuracy, recommends next node
4. **InterventionOrchestrator** (llama-3.3-70b-versatile, streaming) — synthesises all signals into one calibrated, non-moralising response

**Three chat modes:**
- *Skills Coach* (default) — habit coaching, task planning; AI can update your skill task directly via `update_skill_task` tool call and assign game challenges via `create_game_challenge`
- *Study* — direct subject-matter answers; AI surfaces 1–2 relevant study tools via `suggest_study_tools` when a specific tool would genuinely help
- *Training* — Socratic exam prep, never gives answers

**Tool calls available in chat:**
- `update_skill_task` — sets or updates the student's personal study task (time/place/action)
- `suggest_study_tools` — surfaces 1–2 curated tools (StudyFetch, NotebookLM, Napkin, etc.) matched to the current question
- `create_game_challenge` — assigns a quiz or game challenge targeting weak nodes

**Autocomplete:** `/api/chat/suggest` provides inline ghost-text completions as the user types (llama-3.1-8b-instant, max 60 chars, rejects full-sentence rewrites).

**Context fed to the AI per message:**
- Active skill trees and node mastery scores
- Upcoming events and deadlines
- Knowledge profile (subjects/topics where you're struggling or strong)
- Coaching preferences (style, motivation frame, phone screen time)
- Pending game challenges

---

## Features

### Core
- **Subject skill tree** — AI-generated from your own material; nodes show mastery status, prerequisites, and what mastery looks like
- **Assessment sessions** — activity format matched to skill node type; confidence calibration before answering
- **Spaced repetition** — nodes track `lastPracticedAt`, `nextReviewAt`, `reviewInterval`; interval adjusts by mastery score
- **AI chat** — three-mode DCS pipeline with voice input, autocomplete, tool calling, and study tool recommendations
- **Event tracking** — exams, deadlines, projects with days-until countdown
- **Activity history** — full calendar view of past sessions and events

### Games
Low-pressure mini-games that reinforce mastery. Results feed directly into `SkillNode.masteryScore`.

| Game | Mechanic | Accent |
|------|----------|--------|
| **Knowledge Quiz** | Adaptive MCQ grounded in your uploaded material. Difficulty scales with Bloom's taxonomy per node (Recognition → Comprehension → Application → Analysis → Synthesis). Mastered nodes appear as retention checks — wrong answers register a mastery slip. | Purple |
| **Scenario** | Choose-your-adventure situations drawn from your skill tree. Each choice waters or wilts your palm; a step-by-step recap with XP award at the end. | Sky |
| **Speed Round** | 60-second rapid-fire true/false and match-the-concept questions. Difficulty scales with palm stage. Palm flickers the last 10s, explodes with dates on a new personal best. | Amber |
| **Memory Sprint** | Flash a concept card for 12s, then recall it in text. AI scores recall quality and updates mastery. | Cyan |
| **Task Breakdown** | AI gives a vague study goal drawn from your actual skills. You decompose it into steps with time estimates. Scored on specificity, realism, and coverage. | Green |

**Materials → Quiz pipeline:** Every uploaded PDF/file is stored as source material. Hitting **Quiz** on any material card routes directly to a Knowledge Quiz grounded in that file's exact terminology and examples — not generic textbook questions.

**Wrong-answer explanations:** After selecting an incorrect option the quiz shows exactly why that specific choice was wrong (the misconception it represents), then reveals why the correct answer is right.

**Focus Areas panel:** The Games page surfaces your 6 weakest non-locked nodes (masteryScore < 60%) with colored mastery bars and direct Quiz links, so you always know where to start.

**Coach Challenges:** After every chat response the pipeline silently checks: if no challenges are pending and none were assigned in the last 24 hours, it automatically creates a QUIZ challenge targeting your weakest nodes — no prompt required. The AI can also assign challenges manually from chat. All challenges appear on the Games page with difficulty, due date, and a Play button.

### Gamification — Pixel Date Palm
Every skill tree grows its own pixel-art palm through **6 stages** as you earn XP from games. The palm reacts live during play: fronds sway or glow on correct answers, wilt on wrong ones, and water drops fall on watered choices. Stages unlock date clusters, a legendary golden aura, and sparkle effects.

- **XP multiplied by streak** (capped ×5) + **1.5× daily bonus** for first session of the day
- **Health system** — frond fill shifts green → cracked brown as health drops; correct play restores it
- **Level-up ceremony** — full-screen confetti burst + animated palm reveal whenever your palm stages up
- **Palm widget** on the dashboard — health bar, streak, dates earned, daily boost CTA

### Dashboard
- **Palm widget** — skill palm health, streak, daily boost indicator, and watering CTA
- **Plan widget** — most recent skill tree with mastery progress bar and due/active nodes
- **Assessment widget** — AI-generated performance summary (requires past sessions)
- **Events card** — upcoming deadlines with days-until countdown
- **Inspiration widget** — AI-generated daily focus message with editable personal affirmation

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
| AI | Groq API — Llama 3.3 70B (SkillTreeAgent, orchestrator) + Llama 3.1 8B (validation, goal gen, coaches, autocomplete) |
| Email | Resend (password reset) — sends from `noreply@studyskillsbuilder.com` |
| UI | Tailwind CSS + shadcn/ui + framer-motion (page transitions, stagger animations, palm animations) |
| Confetti | canvas-confetti (level-up ceremony + Speed Round personal best) |
| Push | Web Push API + web-push (VAPID) |
| Deployment | Railway (Node.js + PostgreSQL) + Cloudflare Worker (reverse proxy) |
| Domain | studyskillsbuilder.com |
| Cron | Railway cron service → `POST /api/notifications/generate` daily at 8am |

---

## Database Schema

| Model | Purpose |
|-------|---------|
| `User` | Auth identity |
| `UserProfile` | Goals, challenges, theme, banner, onboarding state, coaching prefs, affirmation |
| `SkillTree` | AI-generated skill tree per material upload |
| `SkillNode` | Individual node with mastery status, score, spaced repetition fields |
| `MaterialSource` | Raw markdown content of uploaded files, used to ground quiz questions |
| `QueuedActivity` | Pre-built assessment activities awaiting the student |
| `AssessmentSession` | Completed activity: student response, mastery delta, calibration score |
| `WeeklyInsight` | Weekly AI summary: nodes mastered, weakest concept, narrative |
| `ChatMessage` | AI conversation history |
| `Event` | Upcoming exams/deadlines |
| `Notification` | AI-generated push notifications |
| `PushSubscription` | Web push endpoint per device |
| `KnowledgeEntry` | Persistent subject/topic knowledge profile updated after each chat |
| `Feedback` | User-submitted feedback |
| `GameChallenge` | Coach-assigned or self-started game instance (gameType, difficulty, dueBy, status) |
| `GameSession` | Completed game result: score, duration, per-node deltas, detailsJson |
| `UserGameProfile` | Global XP, level, streak, last-activity date |
| `SkillPalm` | Per-skill-tree palm XP, stage, health, dates earned, streak |

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
    (auth)/              — login, register, password reset, forgot-password
    (app)/               — authenticated pages:
      dashboard/         — main dashboard (palm widget, plan, assessment, events, inspiration)
      onboarding/        — subject + skill tree generation flow
      skills/            — skill tree view + node detail
      games/             — games hub + individual game pages:
        quiz/            — Knowledge Quiz
        scenario/        — Scenario choose-your-adventure
        speed-round/     — Speed Round 60s timer
        memory-sprint/   — Memory Sprint recall
        task-breakdown/  — Task Breakdown planner
      chat/              — AI chat (DCS pipeline, three modes, voice, autocomplete)
      events/            — exam/deadline tracker
      history/           — activity calendar + events + calendar sync
      settings/          — theme, coaching preferences, accent color
    api/
      materials/         — POST: generate skill tree from text/file
        extract-outline/ — POST: extract course outline from uploaded file
      assessment/        — GET: AI performance summary; generate + submit-node
      chat/              — POST: streaming DCS chat
        suggest/         — POST: ghost-text autocomplete (≤60 chars)
        transcribe/      — POST: Whisper voice transcription
      games/
        generate/        — POST: generate quiz questions / memory card / task goal
        submit/          — POST: evaluate responses, update mastery, save GameSession
        scenario/        — POST: generate choose-your-adventure scenario for a skill node
        speed-round/     — POST: generate rapid-fire questions scaled to palm stage
        challenges/      — GET: list PENDING/IN_PROGRESS GameChallenges
        history/         — GET: last 20 GameSessions
      gamification/
        profile/         — GET: full gamification profile + all SkillPalm states
        xp/              — POST: award XP with streak/daily-bonus multipliers
      events/
        sync-calendar/   — POST: import iCal feed (Google, Blackboard, Canvas)
      notifications/
        generate/        — POST: cron endpoint — generate + send daily push notification
        [id]/            — PATCH: mark notification read
      push/
        subscribe/       — POST: register Web Push subscription (VAPID)
      user/
        banner/          — GET/PATCH: dashboard banner URL + position
        coaching-prefs/  — PATCH: coaching style, motivation frame, phone usage
        theme-prefs/     — PATCH: accent color preference
      onboarding/        — POST: complete onboarding profile
      inspiration/       — GET: cached daily AI phrase; PATCH: save personal affirmation
      progression/       — POST: advance skill week phase
      feedback/          — POST: submit user feedback
      cron/
        assessment-scheduler/ — POST: auto-schedule queued assessment activities
  components/
    dashboard/
      PlanWidget         — skill tree progress + due nodes
      PalmWidget         — gamification palm widget (health, streak, CTA)
      AssessmentWidget   — AI performance summary
      EventCard          — upcoming deadlines
      InspirationWidget  — daily phrase + editable affirmation
      DashboardBanner    — custom banner photo with drag-to-reposition
      MiniChatWidget     — embedded streaming AI chat panel
      DashboardGrid      — stagger animation wrapper
    games/
      quiz/              — QuizGame, QuizQuestion, QuizResults (with per-option wrong explanations)
      scenario/          — ScenarioGame: choose-your-adventure with palm reactions
      speed/             — SpeedRoundGame: 60s timer, personal best, confetti burst
      memory-sprint/     — MemorySprintGame, ConceptCard (SVG countdown ring), RecallInput, MemorySprintResults
      task-breakdown/    — TaskBreakdownGame, GoalCard, StepBuilder, TaskBreakdownResults
      palm/              — PixelPalm (SVG, 6 stages, heart fronds, health/cracks, animations)
                           LevelUpCeremony (full-screen stage-up overlay + confetti)
                           LevelUpCeremony auto-dismisses after 3.5s or on tap
      GamesHero          — palm showcase + XP bars on /games page
      WeaknessesSection  — Focus Areas panel: weakest nodes with mastery bars + Quiz links
      CoachChallengesSection — pending coach-assigned challenges with Play buttons
      StandardGamesSection   — game cards grid, passes skillTreeId to each game
    chat/
      ChatInterface      — full chat UI: mode toggle, voice input, autocomplete, tool cards
    history/
      CalendarGrid       — 90-day activity calendar with focus-level color coding
      HistoryHeader      — stats: total sessions, studied days, focused days
      EventsSection      — event list with status (upcoming/passed) and edit/delete
      CalendarSyncSection — iCal feed URL input + sync/disconnect controls
    materials/
      MaterialsClient    — skill tree upload UI + source material cards
      AssessmentPanel    — node detail + activity launch
    skills/
      SkillTreeClient    — skill tree wrapper + node navigation
      SkillTree          — interactive node graph
      SkillDetail        — full node detail (mastery, activities, narrative)
    layout/
      Sidebar            — nav: Dashboard, Skill Tree, Games, AI Coach, Events, Settings
      AnimatedPage       — framer-motion page transition wrapper
      BackgroundOrbs     — ambient animated background orbs
      NotificationBell   — push notification dropdown
      FeedbackButton     — floating feedback widget
      LanguageToggle     — Arabic/English toggle (RTL support)
  lib/
    ai/
      systemPrompt.ts    — single source of truth for AI behavior
      buildContext.ts    — assembles full student state before each AI call
      generateCached.ts  — 23-hour cache wrapper for AI-generated summaries
      dcs/
        pipeline.ts      — DCS pipeline: sentinels → coaches → orchestrator; tool calls (update_skill_task, suggest_study_tools, create_game_challenge)
        sentinels.ts     — rule-based signal extraction; detectFixedMindset regex
        coaches.ts       — 3 parallel llama-3.1-8b-instant calls + optional MindsetInterventionAgent
        analysisAgent.ts — evaluates assessment responses; computes mastery delta, calibration accuracy, recommended next node; calculates spaced-repetition interval
        generationAgent.ts — generates assessment activities for a skill node (format, questions, pairs, code)
        skillTreeAgent.ts  — SkillTreeAgent, validateMaterial, generateStudyGoals
        knowledgeAnalyzer.ts — fire-and-forget knowledge profile updater (llama-3.1-8b-instant)
        types.ts           — shared types (Signals, CoachOutputs)
      games/
        generateQuiz.ts       — QuizGenerationAgent: material-grounded MCQ; weakness + retention targeting; Bloom's taxonomy difficulty bands; per-option misconception explanations
        generateScenario.ts   — branching 3-step scenario with palmEffect per choice
        generateSpeedRound.ts — mixed true/false + match questions scaled to palm stage
        generateMemorySprint.ts
        generateTaskBreakdown.ts
        evaluateRecall.ts
        evaluateTaskBreakdown.ts
    games/
      masteryUpdate.ts   — applyGameMasteryDelta (weighted by isRetentionCheck)
      stabilityUpdate.ts — applyPlanningStabilityNudge (Task Breakdown → SkillProgress)
      autoChallenge.ts   — autoAssignChallengeIfNeeded: silent background challenge creation
      palmStage.ts       — XP thresholds, palm stage / global level computation, streak + daily bonus logic
    converters/
      toMarkdown.ts      — converts uploaded PDF/file content to clean markdown for AI processing
    motion.ts            — shared framer-motion variants (staggerContainer, staggerItem)
    tools-data.ts        — curated study tool registry (key, name, URL, dimension, badge) used by suggest_study_tools
    skills/
      progression.ts     — skill week-phase unlock thresholds and advancement logic
    email.ts             — Resend email sender (password reset)
    language.tsx         — LanguageContext for Arabic/English toggle with RTL support
```

---

## License

MIT
