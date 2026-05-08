# Agenticthon Submission: Study Skills Builder

**Live demo:** https://studyskillsbuilder.com  
**GitHub:** https://github.com/EngHlaa46/study-habits  
**Team:** SSB - Hala Dukhan - Sarah Alablan - Hanin Saleh

---

## The Problem

Most students study — but very few study *effectively*. The gap isn't motivation; it's the absence of real-time, personalized coaching on *why* sessions fail and *which specific behavior* to change next.

Traditional study apps track streaks and gamify effort. That treats the symptom, not the cause. Students don't need a reminder to study — they need a system that notices they always miss sessions on Wednesdays after a difficult class, that their best focus days are when they used the "explain it out loud" method, that their self-talk last week contained three fixed-mindset phrases.

No app does that. So we built one with agents.

---

## The Solution

**Study Skills Builder** is a behavioral coaching system powered by a hierarchical multi-agent pipeline. It coaches students through **one skill at a time**, driven entirely by real behavioral data from daily check-ins.

No gamification. No prescriptive habits. The AI observes, infers, and guides. The student decides.

---

## What the Agent Does

The system has five behaviors:

1. **Observes** — Students log a 90-second daily check-in: Did you study? How focused? Which study method? What mood and energy level?

2. **Infers** — The DCS pipeline extracts behavioral signals the student never explicitly narrates: initiation weakness, emotional vs logistical procrastination patterns, which study methods correlate with their best focus days.

3. **Coaches** — The orchestrator synthesizes signals from three specialist coaches into a single personalized response, always under 150 words, always one question at a time.

4. **Advances** — The system autonomously determines when a student has stabilized a skill and unlocks the next one — no manual selection required.

5. **Nudges** — A cron-scheduled agent generates personalized daily and weekly insights and pushes them to the student's browser.

---

## Decisions the Agent Makes Autonomously

| Decision | How |
|----------|-----|
| **Procrastination classification** | Sentiment analysis of miss-reason text → emotional (overwhelmed, anxious) vs logistical (busy, forgot) → different coaching angle |
| **Best study method** | Correlates study method usage against focus-level outcomes across last 14 check-ins |
| **Mindset intervention** | Regex detects fixed-mindset language ("I always fail", "I have no willpower") → routes message through MindsetInterventionAgent |
| **Most Efficient Insight (MEI)** | Orchestrator synthesises all coach signals → selects single highest-leverage insight for this student today |
| **Skill week advancement** | Rule-based: Week 1 needs ≥4/7 days initiated; Week 2 needs ≥5/7 focused; Week 3 needs stability score ≥0.7 |
| **Level unlock** | When all 3 skills in current level reach stable status → automatically activates all 3 skills in next level |
| **Notification type + content** | Checks if today is the student's weekly signup anniversary → weekly insight vs daily nudge; generates content from 7–14 day behavioral history |
| **Knowledge profile update** | After every chat exchange, infers subject/topic/mastery state and upserts to KnowledgeEntry — silently, never blocking the response |

---

## Multi-Agent Architecture

**System type:** Multi-agent, hierarchical — rule-based tier + specialist LLM tier + synthesis tier + background tier

### Tier 1 — Sentinels (rule-based, no LLM)
Three deterministic agents run first, reading the last 14 check-ins:
- **Behavior Sentinel**: calculates 7-day initiation rate, classifies procrastination type, identifies consecutive miss streaks
- **Cognitive Sentinel**: calculates 7-day focus rate, finds best-performing study method, reads energy and mood trends
- **Metacognitive Sentinel**: checks pre-session intention usage, identifies upcoming exam anchors, calculates days to nearest event
- **Fixed-Mindset Detector**: regex scan of the student's message — triggers MindsetInterventionAgent if matched

Sentinels are fast (no network calls), deterministic, and produce structured signal objects consumed by the coach tier.

### Tier 2 — Specialist Coaches (parallel LLM calls)
Four agents run simultaneously via `Promise.all` using `llama-3.1-8b-instant`:
- **BehavioralCoach**: interprets initiation weakness, task scope mismatches, procrastination patterns
- **CognitiveCoach**: interprets focus capacity, energy-mood-method correlations
- **MetacognitiveCoach**: interprets event urgency, intention habits, planning readiness
- **MindsetInterventionAgent** *(conditional)*: selects a single evidence-based reframing note when fixed-mindset language is detected

Each coach outputs 2–3 internal bullet points (≤15 words each). They fail silently — if one times out, the orchestrator proceeds without it.

### Tier 3 — Orchestrator (streaming, tool-use)
One large model (`llama-3.3-70b-versatile`) receives the full prompt: system philosophy + student state + all coach outputs. It:
- Selects the Most Efficient Insight across all dimensions
- Streams the response to the student via Server-Sent Events
- Detects and executes `update_skill_task` tool calls — directly modifying the student's active skill target in the database, closing the loop between conversation and behavior change

### Tier 4 — Background Agents (fire-and-forget)
- **Knowledge Analyzer**: runs after every response; extracts subject/topic/mastery from the conversation and upserts to the student's knowledge profile. Never blocks the response.
- **Notification Generator**: runs on a daily cron; reads 7–14 days of behavioral history; generates personalized push notifications; delivers via Web Push API (VAPID).

---

## Agent Behavior Rules

The orchestrator operates under strict behavioral constraints defined in `src/lib/ai/systemPrompt.ts`:

- Max 150 words per response unless the student asks for detail
- One question per turn — never stacks multiple asks
- Never uses "you should / must / need to" — uses "consider / might try / one option"
- Never moralizes, shames, or compares students to one another
- Treats missed sessions as data, not failure
- Acknowledges fixed-mindset language once per conversation, then redirects to contradicting behavioral data — never lectures
- Skill coaching adapts to current week phase (Stabilize → Express → Probe) with different focus per phase

---

## Interaction Workflow

```
Student types or speaks a message
  Voice input: Groq Whisper-large-v3 transcribes audio → text appended to field

POST /api/chat { message, chatMode }

  Step 1 · Context Builder
    8 parallel Prisma queries:
    user info · active phase · last 14 check-ins · skill progresses
    upcoming events · user profile · knowledge entries (last 30) · chat history (last 20)
    → assembled into 250-line user state string

  Step 2 · Sentinels (synchronous, no LLM)
    BehaviorSignals + CognitiveSignals + MetacognitiveSignals
    + fixed-mindset flag

  Step 3 · Specialist Coaches (parallel)
    Promise.all([BehavioralCoach, CognitiveCoach, MetacognitiveCoach, MindsetAgent?])
    Each: llama-3.1-8b-instant, temp 0.3, 2–3 internal bullets

  Step 4 · Orchestrator (streaming)
    llama-3.3-70b-versatile receives: system prompt + context + coach outputs
    → streams SSE chunks to client
    → if update_skill_task detected: execute DB upsert → confirmation message

  Step 5 · Knowledge Analyzer (fire-and-forget)
    llama-3.1-8b extracts subject/topic/status from last exchange
    → upserts KnowledgeEntry

SSE stream:
  { step: "sentinels" }  →  { step: "coaches" }  →  { step: "orchestrating" }
  →  { text: "..." }  →  [{ action: "task_updated" }]  →  [DONE]
```

---

## Three Chat Modes

The orchestrator runs in one of three pedagogical modes selectable by the student:

| Mode | Behavior | Tools |
|------|----------|-------|
| **Skills** (default) | Coaches active habit; helps student define/update their skill task | `update_skill_task` |
| **Study** | Answers subject questions directly; recommends study tools | None |
| **Training** | Socratic only — never answers, only asks questions to build retrieval | None |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| LLM Inference | Groq API — llama-3.3-70b-versatile, llama-3.1-8b-instant |
| Voice | Groq Whisper-large-v3 |
| Database | PostgreSQL via Prisma ORM (Railway) |
| Streaming | Server-Sent Events (SSE) |
| Push Notifications | Web Push API + VAPID keys |
| Auth | NextAuth.js v4 (email/password) |
| Hosting | Railway (Node.js + PostgreSQL) + Cloudflare proxy |

---

## What Makes This Agentic

This is not a chatbot with a system prompt. It is a multi-agent system where:

1. **Autonomous signal extraction** — Agents classify student behavior without the student narrating it
2. **Conditional agent routing** — Fixed-mindset detector gates whether MindsetInterventionAgent activates
3. **Tool use with real side effects** — The orchestrator calls `update_skill_task` and modifies database state
4. **Autonomous skill progression** — The stability calculator and level unlock run without human triggers — check-ins drive advancement
5. **Proactive outreach** — The notification agent reaches students before they open the app
6. **Persistent memory across sessions** — Knowledge profile, behavioral history, and skill state persist and compound over time

The system embodies the core agentic principle: **observe → infer → act → remember** — in a loop, every day, for every student.
