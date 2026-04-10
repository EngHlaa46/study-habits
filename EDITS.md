# Build Log — Study Habits

A full record of every feature built, challenge faced, and decision made. Maintained as a transparent development journal for hackathon judges and collaborators.

---

## Research Foundation

The core improvement pass was driven by an Arabic research paper: *"Developing Study Skills and Cognitive Behavior Using AI: Study Skill Builder Platform"*. The paper introduced three skill dimensions (Behavioral / Cognitive / Metacognitive), a Cognitive-Behavioral Model (perception → emotion → behavior), and Growth vs. Fixed Mindset as the primary differentiator for academic outcomes.

Every AI behavior rule, skill categorization, and context-building decision was aligned with this framework.

---

## Features Built

### Authentication & Security
- [x] Email normalization — emails lowercased on register, login, and forgot-password to prevent duplicate accounts
- [x] Password reset flow — forgot-password → Resend email → token-validated reset page
- [x] Resend button on forgot-password with 60s cooldown
- [x] Auto-login after registration + redirect to dashboard
- [x] Input validation and length limits across all API routes
- [x] Enum validation for focusLevel, decayPoint, event type
- [x] Energy/mood bounded to 1–5
- [x] 2000 char limit on chat messages

### Onboarding
- [x] "What trips you up the most" — multi-select with free-text "Other" option
- [x] Challenges stored as JSON array, parsed and passed to AI context

### Daily Check-in
- [x] Full check-in flow — initiated, focus level, energy, mood
- [x] "Why did you miss?" step when not studied — multi-choice + free-text "Other"
- [x] Study methods tracker — what method was used (explain, Q&A, mind map, notes, record, reading)
- [x] **3-option session type** — "Full session" / "Briefly (under 15 min)" / "No" instead of binary Yes/No
  - Brief sessions count as `initiated: true` with `focusLevel: "brief"`
  - Rationale: initiation is the hardest behavioral act — a 7-minute session is a win
- [x] **Pre-session intention field** — optional "What do you plan to do today?" before starting
  - Stored as `sessionIntention` on CheckIn, passed to AI context for metacognitive comparison
- [x] Backfill support — can log check-ins for previous days (up to 3 days back)
- [x] Atypical day flag — marks data as anomalous so AI adjusts without penalizing

### Skill System
- [x] 8 skills across 4 tiers with explicit dependency chain (seeded in DB)
- [x] Skill unlock requires prerequisite to reach "stable" status
- [x] Stability score formula: `0.5 × initiationRate + 0.3 × focusRate + 0.2 × (1 - decayRate)`
  - Brief sessions count 0.5 toward focusRate (added during research improvement pass)
- [x] 3-week deployment cycle: Stabilize → Express → Probe
- [x] User-defined task (time + place + action) per skill
- [x] Skill detail page with training timeline, stats, mini check-in heatmap
- [x] Skill tree redesign — tier colors (cyan/purple/orange/amber), Lucide icons, SVG connection lines between tiers, stability bar on active cards
- [x] **Skill completion narrative** — when a skill reaches stable/mastered, user can generate a 2–3 sentence AI growth summary (cached in DB, generate-once pattern)
- [x] **Dimension field on skills** — each skill tagged as behavioral / cognitive / metacognitive per research paper

### Dashboard
- [x] Phase banner — current phase + day count + active skill info
- [x] Active Plan Card during skill_training — shows skill, week phase, user challenges, recovery tip
- [x] Observation phase nudge card — check-in progress bar + call to action
- [x] Skill Radar Chart (Recharts, lazy-loaded)
- [x] Weekly Trend Chart (Recharts, lazy-loaded)
- [x] Check-in Widget with 14-day dot calendar
- [x] Event Card — upcoming exams/deadlines with days-until
- [x] **Dimension Profile Card** — horizontal progress bars for Behavioral / Cognitive / Metacognitive scores, with expandable "What are these?" explanation panel
- [x] Today's Note (InspirationWidget) — AI-generated daily phrase + personal affirmation field
- [x] Assessment Widget — periodic self-assessment prompt
- [x] Mini Chat Widget — quick AI access from dashboard
- [x] NoSkillCard — contextual prompt when no active skill
- [x] SkillOverviewSection — all skills summary at bottom of dashboard

### AI Coaching
- [x] Groq API integration (Llama 3.3 70B Versatile) — switched from Anthropic due to free tier
- [x] Full context builder — phase, active skill, last 14 check-ins, upcoming events, challenges, skill statuses, study method correlations
- [x] **Mindset detection and reframing** — detects absolute/trait/hopeless language, reframes once per conversation using student's own data, prohibits positivity overload
- [x] **Procrastination pattern signal** — repeated miss reasons (3+ occurrences) emitted to AI as a named pattern with emotional vs. logistical classification
- [x] **Dimension-aware advice** — AI interprets behavioral/cognitive/metacognitive scores and adjusts advice tier accordingly
- [x] **Brief session reinforcement** — system prompt treats brief sessions as behavioral wins, not partial failures
- [x] Session intention in context — AI can compare stated intention vs. actual outcome (metacognitive loop)
- [x] Procrastination pattern interpretation rules in system prompt
- [x] Miss reason included in per-check-in context lines
- [x] Study method → focus correlation computed and included (e.g. `qa: 3/4 focused`)

### Notifications
- [x] Daily notification via cron — AI-generated 1–2 sentence personalized motivation (Groq)
- [x] **Weekly cognitive-behavioral insight** — runs on user's account-creation weekday, richer prompt covering dimension profile + procrastination pattern + 14-day stats (stored as `type: "weekly"`)
- [x] Notification bell in sidebar with unread count badge
- [x] Dismiss individual notifications
- [x] Refetch on open (was previously only fetching on mount — missed new notifications without page refresh)
- [x] **Web Push Notifications (PWA)** — users can enable phone push notifications from the notification bell dropdown
  - Service worker (`public/sw.js`) handles push events and notification clicks
  - VAPID-based authentication via `web-push` library
  - Subscriptions stored in `PushSubscription` table
  - Expired subscriptions auto-cleaned on send failure
  - Works on Android Chrome and iOS Safari 16.4+ (requires Add to Home Screen on iOS)

### PWA
- [x] `public/manifest.json` — app name, theme color, start URL, icons
- [x] Service worker registration via `PushProvider` client component
- [x] Notification click → opens app at `/dashboard`
- [x] `manifest` metadata in root layout

### Dashboard Banner
- [x] Custom banner photo via URL paste
- [x] **Drag-to-reposition** — user can drag the image to change `backgroundPosition`
  - Uses Pointer Events API (`pointerdown/pointermove/pointerup`) for unified mouse + touch
  - `setPointerCapture` keeps tracking even when finger moves outside the element
  - `touch-none` CSS prevents Safari scroll interference
  - Position stored as `"X% Y%"` in `bannerPosition` field on UserProfile
  - Real-time preview during drag, saved on "Save position" button

### Personalization
- [x] Accent color picker in settings — full theme customization
- [x] Arabic / English language toggle with RTL support, persisted in localStorage
- [x] Personal affirmation field on Today's Note widget

### Communication
- [x] **Feedback system** — "Send Feedback" button in sidebar opens modal with textarea
  - Stored in `Feedback` table with userId and timestamp
  - Admin view at `/admin/feedback` (restricted to admin email)
  - EN + AR translations

### Admin
- [x] `/admin/feedback` — lists all user feedback submissions with name, email, timestamp, message

---

## Technical Challenges Faced

### 1. ESLint Build Failure on Render
**Problem:** An unused variable `isBackfill` was left in `check-in/route.ts` after a refactor. Render's production build runs ESLint with `--max-warnings 0`, causing a hard failure. The site was stuck on the old deploy for hours.
**Fix:** Deleted the unused line entirely. Lesson: ESLint errors that pass locally can still block production builds if CI is stricter.

### 2. Prisma Client Not Reused in Production
**Problem:** The Prisma singleton was guarded by `if (process.env.NODE_ENV !== 'production')` — the wrong condition. In production, a new client was created on every request, exhausting connections.
**Fix:** Changed to `if (process.env.NODE_ENV === 'development')` so the global singleton is only bypassed in development.

### 3. Supabase MaxClientsInSessionMode Crash
**Problem:** The app crashed under load with `FATAL: MaxClientsInSessionMode: max clients reached`. The `DATABASE_URL` was using port 5432 (Session mode), which has a very limited connection count.
**Fix:** Switched to port 6543 (Transaction mode) with `?pgbouncer=true&connection_limit=1`. Transaction mode is designed for serverless/pooled environments. Schema pushes still use port 5432 temporarily since pgbouncer doesn't support DDL statements.

### 4. TypeScript Errors from `web-push` Import
**Problem:** `import webpush from "web-push"` caused a TS error because `web-push` is a CommonJS module without a default export.
**Fix:** Changed to `import * as webpush from "web-push"`.

### 5. Uint8Array Type Error in PushProvider
**Problem:** `Uint8Array.from([...rawData].map(...))` caused a TypeScript error because spreading a string requires `--downlevelIteration`, and the resulting type was incompatible with `applicationServerKey`.
**Fix:** Replaced with a manual `for` loop building a `Uint8Array` and returning `.buffer` as `ArrayBuffer`.

### 6. Prisma db push on Windows (UNC Path)
**Problem:** Running `prisma db push` from Windows CMD.EXE using a UNC path (`\\wsl.localhost\...`) failed with "UNC paths not supported".
**Fix:** Must run from inside WSL bash terminal, not from Windows CMD.

### 7. DATABASE_URL with Special Characters
**Problem:** Running `DATABASE_URL="..."` inline in bash failed with `P1013: invalid domain character` when the URL contained special characters in the password field.
**Fix:** Wrapped the entire URL in single quotes to prevent bash from interpreting special characters.

### 8. TypeScript Backtick Errors in Template Literal
**Problem:** Used backtick characters (`` ` ``) inside a template literal string in `systemPrompt.ts`, causing TS1005 parse errors.
**Fix:** Replaced embedded backticks with regular double-quote characters.

### 9. Banner Drag Not Working on Safari/iOS
**Problem:** The initial drag implementation used React's `onMouseDown`/`onTouchStart` synthetic events. On iOS Safari, `touchstart` events added via React are passive by default and cannot call `preventDefault()`, which meant iOS scroll behavior intercepted the drag.
**Fix:** Replaced mouse + touch events with the **Pointer Events API** (`pointerdown`, `pointermove`, `pointerup`) attached directly to the DOM element. `setPointerCapture(e.pointerId)` ensures the element keeps receiving pointer events even when the finger leaves its bounds. Added `touch-none` CSS class to prevent scroll interference.

### 10. Render Deploy Not Triggering
**Problem:** Code was pushed but Render wasn't deploying because a previous build had failed due to missing `web-push` dependency. The failed build blocked the queue.
**Fix:** Installed `web-push` and `@types/web-push`, pushed `package.json` and `package-lock.json`, which triggered a fresh successful build.

### 11. InspirationWidget Height Alignment
**Problem:** The dashboard right column (DimensionProfileCard + InspirationWidget) was shorter than the left column (SkillRadarChart + AssessmentWidget) because `space-y-6` doesn't allow flex growth, and `SkillRadarChart` had a hardcoded `mb-6` that added double spacing.
**Fix:** Changed column wrappers to `flex flex-col gap-6`, removed `mb-6` from SkillRadarChart, wrapped InspirationWidget in `flex-1 min-h-0` div, and added `h-full flex flex-col` to InspirationWidget's root.

### 12. Notification Bell Not Refreshing
**Problem:** Notifications were only fetched on component mount. If a notification arrived after page load, the bell wouldn't show it until the page was refreshed.
**Fix:** Added a second `useEffect` that calls `fetchNotifications()` and `getPushState()` whenever the dropdown opens.

### 13. Stray `=` File Committed
**Problem:** A heredoc in a `git commit` command accidentally created a file named `=` in the project root, which was staged and committed.
**Fix:** Deleted the file and committed the deletion immediately.

---

## Infrastructure Decisions

| Decision | Why |
|----------|-----|
| Switched from Anthropic API → Groq | Free tier with Llama 3.3 70B — sufficient quality for coaching context |
| Switched Railway → Vercel → Render → Railway | Full circle: finally on Railway with native PostgreSQL, no cold starts, no connection pool issues |
| Migrated Supabase → Railway PostgreSQL | Node.js pg client exported data to JSON, imported via internal API route (postgres.railway.internal accessible only from inside Railway) |
| Cloudflare Worker for custom domain routing | Railway's Fastly CDN (151.101.2.15) doesn't handle custom domains correctly; edge servers never activated. Cloudflare Worker proxies all requests with Host header override — transparent to the app |
| Render → Railway redirect via next.config.mjs | Old Render URL (study-skills-builder.onrender.com) redirects 301 to studyskillsbuilder.com using Next.js host-based redirect rule — preserves paths, no separate service needed |
| Cloudflare DNS (migrated from Namecheap) | Namecheap couldn't delete conflicting A records; Cloudflare gave full DNS control + free Workers + auto SSL via Let's Encrypt |
| Railway native cron service | Replaced cron-job.org with a Railway cron service (Docker container running curl) — keeps infrastructure consolidated |
| Dual Prisma schemas | Allows SQLite locally (zero setup) and PostgreSQL in production without branching |
| `next start` only in start script | Running `prisma db push` in start caused a 3-hour 503 outage when Supabase was briefly unreachable on Render wake-up |
| Generate-once pattern for AI content | Inspiration text, assessment text, skill narratives are generated once and cached in DB to avoid redundant API calls |
| Recharts lazy-loaded via `next/dynamic` | Recharts adds ~218kB to first load; dynamic import with `ssr: false` keeps the initial bundle small |
| Pointer Events API for banner drag | Single unified API for mouse and touch — avoids maintaining two separate event handler sets and works correctly on iOS Safari |

---

## Schema Changes (Additive Only)

All schema changes were additive (nullable fields, new models) to avoid breaking existing data:

| Field/Model | Added For |
|-------------|-----------|
| `Skill.dimension` | Dimension profile card + AI context |
| `SkillProgress.completionNarrative` | Skill growth summary generation |
| `SkillProgress.completionNarrativeAt` | Cache timestamp for narrative |
| `CheckIn.sessionIntention` | Pre-session planning (metacognitive loop) |
| `Notification.type` | Distinguish daily vs. weekly notifications |
| `UserProfile.bannerPosition` | Persist drag-to-reposition value |
| `PushSubscription` (model) | Web push notification subscriptions |
| `Feedback` (model) | User feedback submissions |

---

## Pending / Known Limitations

- **Email (Resend)** — ~~needs a verified domain~~ **resolved**: `studyskillsbuilder.com` verified in Resend via Cloudflare auto-configure. Sends from `noreply@studyskillsbuilder.com`. Still falls back to console.log locally when `RESEND_API_KEY` is missing.
- **Push on iOS** — requires iOS 16.4+ and the app must be added to the Home Screen. Regular Safari tabs cannot receive push.
- **Phone usage integration** — schema has `phoneDataConsent` field; UI not yet built.
- **AI proactive surfacing** — AI currently waits for user to ask about patterns rather than proactively raising them during observation.
- **Event distance validation** — events page exists but minimum 5–7 day distance enforcement not implemented.
- **Motivation & Stories section** — planned but not built; content would be tied to active skill and challenges, not generic.
