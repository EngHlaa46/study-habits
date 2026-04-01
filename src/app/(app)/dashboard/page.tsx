import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PhaseBanner } from "@/components/dashboard/PhaseBanner";
import { ActiveSkillCard } from "@/components/dashboard/ActiveSkillCard";
import { ActivePlanCard } from "@/components/dashboard/ActivePlanCard";
import { CheckInWidget } from "@/components/dashboard/CheckInWidget";
import { EventCard } from "@/components/dashboard/EventCard";
import { InspirationWidget } from "@/components/dashboard/InspirationWidget";
import { AssessmentWidget } from "@/components/dashboard/AssessmentWidget";
import { MiniChatWidget } from "@/components/dashboard/MiniChatWidget";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";
import { DimensionProfileCard } from "@/components/dashboard/DimensionProfileCard";
import { ObservationNudge } from "@/components/dashboard/ObservationNudge";
import { NoSkillCard } from "@/components/dashboard/NoSkillCard";
import { SkillOverviewSection } from "@/components/dashboard/SkillOverviewSection";
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

  const dimensionSkills = skillProgresses.map((sp) => ({
    dimension: sp.skill.dimension ?? null,
    status: sp.status,
    stabilityScore: sp.stabilityScore,
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <DashboardBanner />
      <PhaseBanner
        phase={phase}
        dayCount={dayCount}
        activeSkillName={activeSkillProgress?.skill.name}
        weekPhase={activeSkillProgress?.weekPhase}
      />

      {/* Observation phase nudge */}
      {phase === "observation" && (
        <ObservationNudge checkInCount={recentCheckIns.length} />
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
          <NoSkillCard phase={phase} />
        )}

        <CheckInWidget
          todayCompleted={!!todayCheckIn}
          recentCheckIns={formattedCheckIns}
        />

        <EventCard events={formattedEvents} />
      </div>

      {/* Skill Radar + Dimension Profile + Today's note */}
      {radarSkills.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <SkillRadarChart skills={radarSkills} />
            <AssessmentWidget />
          </div>
          <div className="space-y-6">
            <DimensionProfileCard skills={dimensionSkills} />
            <InspirationWidget />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <InspirationWidget />
          <AssessmentWidget />
        </div>
      )}

      {/* Mini chat widget */}
      <MiniChatWidget initialMessages={initialChatMessages} />

      {/* Weekly trend chart */}
      <div className="mt-6">
        <WeeklyTrendChart checkIns={trendCheckIns} />
      </div>

      <SkillOverviewSection
        skills={skillProgresses
          .sort((a, b) => a.skill.tier - b.skill.tier)
          .map((sp) => ({
            id: sp.id,
            skillName: sp.skill.name,
            skillTier: sp.skill.tier,
            status: sp.status,
          }))}
      />
    </div>
  );
}
