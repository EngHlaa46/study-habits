import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { SkillDetail } from "@/components/skills/SkillDetail";

export default async function SkillDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await requireAuth();
  const userId = session.user.id;

  const skill = await prisma.skill.findUnique({
    where: { slug: params.slug },
    include: {
      progresses: { where: { userId } },
    },
  });

  if (!skill) {
    notFound();
  }

  const progress = skill.progresses[0] || null;

  // Get check-ins for the skill training period
  const checkIns = progress?.weekPhaseStart
    ? await prisma.checkIn.findMany({
        where: {
          userId,
          date: { gte: progress.weekPhaseStart },
        },
        orderBy: { date: "asc" },
      })
    : [];

  const serializedCheckIns = checkIns.map((ci) => ({
    date: ci.date.toISOString().split("T")[0],
    initiated: ci.initiated,
    focusLevel: ci.focusLevel,
    atypical: ci.atypical,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <SkillDetail
        skill={{
          id: skill.id,
          slug: skill.slug,
          name: skill.name,
          level: skill.level,
          dimension: skill.dimension ?? "behavioral",
          description: skill.description,
          purpose: skill.purpose,
        }}
        progress={
          progress
            ? {
                id: progress.id,
                status: progress.status,
                weekPhase: progress.weekPhase,
                stabilityScore: progress.stabilityScore,
                userTask: progress.userTask,
                weekPhaseStart: progress.weekPhaseStart?.toISOString() || null,
                completionNarrative: (progress as { completionNarrative?: string | null }).completionNarrative ?? null,
              }
            : null
        }
        checkIns={serializedCheckIns}
      />
    </div>
  );
}
