import { prisma } from "@/lib/db/prisma";

const COOLDOWN_HOURS = 24;
const MAX_NODES = 5;

export async function autoAssignChallengeIfNeeded(userId: string): Promise<void> {
  // Skip if any challenge is already waiting
  const pendingCount = await prisma.gameChallenge.count({
    where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
  });
  if (pendingCount > 0) return;

  // Skip if an agent challenge was created within the cooldown window
  const recent = await prisma.gameChallenge.findFirst({
    where: { userId, createdBy: "AGENT" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent) {
    const hoursSince = (Date.now() - recent.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < COOLDOWN_HOURS) return;
  }

  // Find the weakest non-locked nodes
  const weakNodes = await prisma.skillNode.findMany({
    where: {
      skillTree: { userId },
      masteryStatus: { not: "locked" },
      masteryScore: { lt: 0.70 },
    },
    orderBy: { masteryScore: "asc" },
    take: MAX_NODES,
    select: {
      id: true,
      name: true,
      masteryScore: true,
      skillTree: { select: { materialName: true } },
    },
  });

  if (weakNodes.length === 0) return;

  const nodeIds = weakNodes.map((n) => n.id);
  const materialName = weakNodes[0].skillTree.materialName;
  const lowestPct = Math.round(weakNodes[0].masteryScore * 100);
  const difficulty = weakNodes[0].masteryScore < 0.30 ? "EASY" : "MEDIUM";

  await prisma.gameChallenge.create({
    data: {
      userId,
      createdBy: "AGENT",
      gameType: "QUIZ",
      title: "Strengthen Your Weakest Areas",
      description: `Your coach spotted ${weakNodes.length} concept${weakNodes.length > 1 ? "s" : ""} in "${materialName}" that need more practice (lowest: ${lowestPct}% mastery). Quiz yourself to push them forward.`,
      difficulty,
      nodeIds: JSON.stringify(nodeIds),
      status: "PENDING",
    },
  });
}
