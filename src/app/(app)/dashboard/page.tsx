import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PhaseBanner } from "@/components/dashboard/PhaseBanner";
import { ActiveSkillCard } from "@/components/dashboard/ActiveSkillCard";
import { ActivePlanCard } from "@/components/dashboard/ActivePlanCard";
import { CheckInWidget } from "@/components/dashboard/CheckInWidget";
import { EventCard } from "@/components/dashboard/EventCard";
import { InspirationWidget } from "@/components/dashboard/InspirationWidget";
import { AssessmentWidget } from "@/components/dashboard/AssessmentWidget";
import { MiniChatWidget } from "@/components/dashboard/MiniChatWidget";
import dynamic from "next/dynamic";

const WeeklyTrendChart = dynamic(
  () => import("@/components/dashboard/WeeklyTrendChart").then((m) => ({ default: m.WeeklyTrendChart })),
  { ssr: false, loading: () => <div className="h-48 bg-card rounded-xl animate-pulse" /> }
);
const SkillRadarChart = dynamic(
  () => import("@/components/dashboard/SkillRadarChart").then((m) => ({ default: m.SkillRadarChart })),
  { ssr: false, loading: () => <div className="h-48 bg-card rounded-xl animate-pulse" /> }
);

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  // Check if onboarding is complete
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });
  if (!profile?.onboardingComplete) {
    redirect("/onboarding");
  }

  const [activePhase, skillProgresses, recentCheckIns, upcomingEvents, recentChatMessages] =
    await Promise.all([
      prisma.activePhase.findUnique({ where: { userId } }),
      prisma.skillProgress.findMany({
        where: { userId },
        include: { skill: true },
      }),
      prisma.checkIn.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 14,
      }),
      prisma.event.findMany({
        where: { userId, status: "upcoming" },
        orderBy: { date: "asc" },
        take: 3,
      }),
      prisma.chatMessage.findMany({
        where: { userId, role: { in: ["user", "assistant"] } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

  const phase = activePhase?.phase || "onboarding";
  const dayCount = activePhase
    ? Math.ceil(
        (Date.now() - activePhase.phaseStart.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const activeSkillProgress = skillProgresses.find(
    (sp) => sp.status === "active"
  );

  const today = new Date().toISOString().split("T")[0];
  const todayCheckIn = recentCheckIns.find(
    (ci) => ci.date.toISOString().split("T")[0] === today
  );

  const formattedCheckIns = recentCheckIns
    .map((ci) => ({
      date: ci.date.toISOString().split("T")[0],
      initiated: ci.initiated,
      focusLevel: ci.focusLevel,
    }))
    .reverse();

  const trendCheckIns = recentCheckIns.map((ci) => ({
    date: ci.date.toISOString().split("T")[0],
    initiated: ci.initiated,
    focusLevel: ci.focusLevel,
  }));

  const initialChatMessages = recentChatMessages
    .reverse()
    .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }));

  const formattedEvents = upcomingEvents.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    date: e.date.toISOString().split("T")[0],
    daysUntil: Math.ceil(
      (e.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ),
  }));

  // Parse challenges from profile
  let challenges: string[] = [];
  if (profile?.biggestChallenge) {
    try {
      const parsed = JSON.parse(profile.biggestChallenge);
      challenges = Array.isArray(parsed) ? parsed : [profile.biggestChallenge];
    } catch {
      challenges = [profile.biggestChallenge];
    }
  }

  const radarSkills = skillProgresses
    .sort((a, b) => a.skill.tier - b.skill.tier)
    .map((sp) => ({
      name: sp.skill.name,
      status: sp.status,
      stabilityScore: sp.stabilityScore,
    }));

  return (
    <div className="max-w-6xl mx-auto">
      <PhaseBanner
        phase={phase}
        dayCount={dayCount}
        activeSkillName={activeSkillProgress?.skill.name}
        weekPhase={activeSkillProgress?.weekPhase}
      />

      {/* Observation phase nudge */}
      {phase === "observation" && (
        <div className="mb-6 bg-card border border-[#38bdf8]/30 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-foreground font-semibold mb-1">You&apos;re in observation mode</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Study as you normally would and log your daily check-ins. After 5+ check-ins we&apos;ll unlock your first skill.
                If you&apos;re noticing patterns — distractions, low energy, trouble starting — talk to your coach about them now.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-6 h-2 rounded ${
                        i <= recentCheckIns.length ? "bg-[#38bdf8]" : "bg-secondary"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground text-xs">{Math.min(recentCheckIns.length, 5)}/5 check-ins</span>
              </div>
            </div>
            <Link
              href="/chat"
              className="shrink-0 px-4 py-2 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] text-sm font-medium hover:bg-[#38bdf8]/20 transition-colors"
            >
              Talk to coach →
            </Link>
          </div>
        </div>
      )}

      {/* Active plan card — always visible during skill training */}
      {phase === "skill_training" && activeSkillProgress && (
        <ActivePlanCard
          skillName={activeSkillProgress.skill.name}
          skillDescription={activeSkillProgress.skill.description}
          weekPhase={activeSkillProgress.weekPhase}
          challenges={challenges}
          userTask={activeSkillProgress.userTask ?? null}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeSkillProgress ? (
          <ActiveSkillCard
            skillName={activeSkillProgress.skill.name}
            skillDescription={activeSkillProgress.skill.description}
            weekPhase={activeSkillProgress.weekPhase}
            userTask={activeSkillProgress.userTask}
            stabilityScore={activeSkillProgress.stabilityScore}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-foreground text-lg font-semibold mb-2">
              {phase === "observation"
                ? "Observation in Progress"
                : "No Active Skill"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {phase === "observation"
                ? "Complete your daily check-ins. After 5+ check-ins in 7 days, you'll unlock your first skill."
                : "Visit the Skills page to activate a skill."}
            </p>
          </div>
        )}

        <CheckInWidget
          todayCompleted={!!todayCheckIn}
          recentCheckIns={formattedCheckIns}
        />

        <EventCard events={formattedEvents} />
      </div>

      {/* Skill Radar Chart */}
      {radarSkills.length > 0 && (
        <div className="mt-6">
          <SkillRadarChart skills={radarSkills} />
        </div>
      )}

      {/* AI widgets row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <InspirationWidget />
        <AssessmentWidget />
      </div>

      {/* Mini chat widget */}
      <MiniChatWidget initialMessages={initialChatMessages} />

      {/* Weekly trend chart */}
      <div className="mt-6">
        <WeeklyTrendChart checkIns={trendCheckIns} />
      </div>

      {/* Skill overview */}
      <div className="mt-6">
        <h2 className="text-foreground text-lg font-semibold mb-4">
          Skill Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {skillProgresses
            .sort((a, b) => a.skill.tier - b.skill.tier)
            .map((sp) => {
              const statusColors: Record<string, string> = {
                locked: "border-muted-foreground/30 text-muted-foreground/60",
                available: "border-border text-muted-foreground",
                active: "border-[#38bdf8] text-[#38bdf8]",
                stable: "border-[#4ade80] text-[#4ade80]",
                mastered: "border-[#fbbf24] text-[#fbbf24]",
              };
              const colors = statusColors[sp.status] || statusColors.locked;
              return (
                <div
                  key={sp.id}
                  className={`border rounded-lg p-3 bg-card ${colors}`}
                >
                  <p className="text-xs opacity-60 mb-1">
                    Tier {sp.skill.tier}
                  </p>
                  <p className="text-sm font-medium">{sp.skill.name}</p>
                  <p className="text-xs capitalize mt-1 opacity-60">
                    {sp.status}
                  </p>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
