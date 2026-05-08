import { prisma } from "@/lib/db/prisma";

export async function applyPlanningStabilityNudge(
  userId: string,
  compositeScore: number // 0-100
): Promise<void> {
  const planningSkill = await prisma.skillProgress.findFirst({
    where: { userId, status: "active" },
    include: { skill: true },
  });

  if (!planningSkill) return;

  const planningProgress = await prisma.skillProgress.findFirst({
    where: {
      userId,
      status: "active",
      skill: { dimension: "planning" },
    },
  });

  if (!planningProgress) return;

  // Small nudge: max 0.03 per game session
  const nudge = (compositeScore / 100) * 0.03;
  const newScore = Math.min(1, planningProgress.stabilityScore + nudge);

  await prisma.skillProgress.update({
    where: { id: planningProgress.id },
    data: { stabilityScore: newScore },
  });
}
