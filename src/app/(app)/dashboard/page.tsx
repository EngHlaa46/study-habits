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

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile?.onboardingComplete) {
    redirect("/onboarding");
  }

  const now = new Date();

  const [activePhase, skillTrees, recentCheckIns, upcomingEvents] =
    await Promise.all([
      prisma.activePhase.findUnique({ where: { userId } }),
      prisma.skillTree.findMany({
        where: { userId },
        include: {
          nodes: {
            where: { masteryStatus: { in: ["active", "developing", "mastered", "maintenance"] } },
            orderBy: { masteryScore: "desc" },
          },
        },
        orderBy: { generatedAt: "desc" },
        take: 5,
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

  // Existing users with no skill trees need to go through subject selection
  if (skillTrees.length === 0) {
    redirect("/onboarding?returning=true");
  }

  const phase = activePhase?.phase || "onboarding";
  const dayCount = activePhase
    ? Math.ceil((Date.now() - activePhase.phaseStart.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Build skill tree summaries for PlanWidget
  const skillTreeSummaries = await Promise.all(
    skillTrees.map(async (tree) => {
      const totalNodes = await prisma.skillNode.count({ where: { skillTreeId: tree.id } });
      const masteredNodes = await prisma.skillNode.count({
        where: { skillTreeId: tree.id, masteryStatus: { in: ["mastered", "maintenance"] } },
      });
      return {
        id: tree.id,
        materialName: tree.materialName,
        totalNodes,
        masteredNodes,
        activeNodes: tree.nodes
          .filter((n) => n.masteryStatus === "active" || n.masteryStatus === "developing")
          .map((n) => ({
            id: n.id,
            name: n.name,
            masteryScore: n.masteryScore,
            masteryStatus: n.masteryStatus,
            isDue: n.nextReviewAt != null && n.nextReviewAt <= now,
          })),
      };
    })
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

  const formattedEvents = upcomingEvents.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    date: e.date.toISOString().split("T")[0],
    daysUntil: Math.ceil((e.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <DashboardBanner />
      <PhaseBanner phase={phase} dayCount={dayCount} activeLevel={1} />

      {/* Skill tree plan widget */}
      <PlanWidget skillTrees={skillTreeSummaries} />

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
