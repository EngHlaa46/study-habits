import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PhaseBanner } from "@/components/dashboard/PhaseBanner";
import { CheckInWidget } from "@/components/dashboard/CheckInWidget";
import { EventCard } from "@/components/dashboard/EventCard";
import { InspirationWidget } from "@/components/dashboard/InspirationWidget";
import { AssessmentWidget } from "@/components/dashboard/AssessmentWidget";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";
import { PlanWidget } from "@/components/dashboard/PlanWidget";

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

  const [activePhase, skillProgresses, recentCheckIns, upcomingEvents] =
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
    ]);

  const phase = activePhase?.phase || "onboarding";
  const dayCount = activePhase
    ? Math.ceil(
        (Date.now() - activePhase.phaseStart.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const activeSkillProgresses = skillProgresses.filter(
    (sp) => sp.status === "active"
  );
  const activeLevel = activeSkillProgresses[0]?.skill.level ?? 1;

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

  const formattedEvents = upcomingEvents.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    date: e.date.toISOString().split("T")[0],
    daysUntil: Math.ceil(
      (e.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <DashboardBanner />
      <PhaseBanner
        phase={phase}
        dayCount={dayCount}
        activeLevel={activeLevel}
      />

      {/* Compact plan widget — links to skill tree */}
      {phase === "skill_training" && activeSkillProgresses.length > 0 && (
        <PlanWidget
          activeSkills={activeSkillProgresses.map((sp) => ({
            name: sp.skill.name,
            dimension: sp.skill.dimension ?? "behavioral",
            weekPhase: sp.weekPhase,
          }))}
          levelNumber={activeLevel}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CheckInWidget
          todayCompleted={!!todayCheckIn}
          recentCheckIns={formattedCheckIns}
        />

        <EventCard events={formattedEvents} />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <AssessmentWidget />
        <InspirationWidget />
      </div>
    </div>
  );
}
