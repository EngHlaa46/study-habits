# Edits & Feature Tracker

## Completed

### Auth
- [x] Email case sensitivity — normalize to lowercase on register, login, and forgot-password
- [x] Password reset flow — forgot-password → email link → reset
- [x] Resend button on forgot-password page with 60s cooldown
- [x] Auto-login after registration and redirect to dashboard

### Security
- [x] Input validation and length limits across all API routes
- [x] Enum validation for focusLevel, decayPoint, event type
- [x] 1–5 bounds enforcement for energy and mood
- [x] 2000 char message limit on chat

### Onboarding
- [x] "What trips you up the most" — multi-select + free text "Other" option

### Check-in
- [x] "Why did you miss?" step when not studied — multi-choice + free text "Other"
- [x] Study methods tracker — "What method did you use?" multi-select (explain, Q&A, mind map, notes, record, reading)

### Dashboard
- [x] Observation phase nudge card — check-in progress bar + "Talk to coach" button
- [x] Plan card during skill_training — shows challenges, active skill, week phase, recovery tip

### Skill Tree
- [x] Skill unlock clarity — banner explaining unlock logic, prerequisites shown with met/unmet status in dialog and detail page
- [x] Skill tree redesign — tier colors (cyan/purple/orange/amber), Lucide icons, SVG connection lines between tiers, stability bar on active cards

### Language
- [x] Arabic/English language toggle with RTL support — persisted in localStorage, applied to `<html dir>` and `<html lang>`

### Performance
- [x] Prisma singleton fixed — was never reused in production (wrong NODE_ENV check)
- [x] Dashboard: removed duplicate userProfile fetch
- [x] Recharts lazy-loaded via next/dynamic to reduce initial bundle
- [x] vercel.json removed (switched to Render); Render region should match Supabase (us-east-1)

### Infrastructure
- [x] Migrated from Railway → Vercel → Render
- [x] Supabase PostgreSQL with Transaction pooler (port 6543, ?pgbouncer=true)
- [x] Dual Prisma schema: schema.dev.prisma (SQLite local) + schema.prisma (PostgreSQL production)

### AI Context
- [x] missReason included in check-in context passed to AI
- [x] Study method per check-in included in context
- [x] Method → focus correlation computed and passed to AI (e.g. qa(3/4 focused))

---

## Pending

### AI Behavior
- [ ] AI should actively surface recurring bad habits during observation phase — not wait for user to ask
- [ ] AI should factor missed day reasons into analysis, not just count the absence
- [ ] After observation phase ends, AI generates a detailed written plan

### Skills
- [ ] Skills page should show how the active skill connects to the user's identified bad habit

### Phone Usage (FR-10)
- [ ] Opt-in consent toggle in settings (schema has `phoneDataConsent` field)
- [ ] UI to log phone usage data
- [ ] AI uses phone usage patterns for scheduling suggestions

### Motivation & Stories
- [ ] Dedicated section for motivational content: quotes, short stories, real examples
- [ ] Content tied to active skill/bad habit — not generic
- [ ] "You're not alone" tone, not a lecture

### Email
- [ ] Switch from Resend to Brevo (or similar) — allows sending to any email without a custom domain

### To Investigate
- [ ] (keep testing and add issues here)
