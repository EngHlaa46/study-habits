import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { EventCard } from "@/components/dashboard/EventCard";
import { InspirationWidget } from "@/components/dashboard/InspirationWidget";
import { AssessmentWidget } from "@/components/dashboard/AssessmentWidget";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";
import { PlanWidget } from "@/components/dashboard/PlanWidget";
import { PalmWidget } from "@/components/dashboard/PalmWidget";

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile?.onboardingComplete) {
    redirect("/onboarding");
  }

  const now = new Date();

  const [skillTrees, upcomingEvents] = await Promise.all([
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
    prisma.event.findMany({
      where: { userId, status: "upcoming" },
      orderBy: { date: "asc" },
      take: 3,
    }),
  ]);

  if (skillTrees.length === 0) {
    redirect("/onboarding?returning=true");
  }

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

  const formattedEvents = upcomingEvents.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    date: e.date.toISOString().split("T")[0],
    daysUntil: Math.ceil((e.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <DashboardBanner />

      <PlanWidget skillTrees={skillTreeSummaries} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AssessmentWidget />
        <EventCard events={formattedEvents} />
        <PalmWidget />
      </div>

      <InspirationWidget />
    </div>
  );
}
