import { prisma } from "@/lib/db/prisma";
import { calculateMasteryStatus, calculateSpacedRepetition } from "@/lib/ai/dcs/analysisAgent";
import type { NodeMasteryDelta } from "@/types/games";

export async function applyGameMasteryDelta(
  nodeId: string,
  gameScore: number,       // 0-1 per-node score
  userId: string,
  isRetentionCheck = false
): Promise<Omit<NodeMasteryDelta, "isRetentionCheck">> {
  const node = await prisma.skillNode.findUnique({ where: { id: nodeId } });
  if (!node) throw new Error(`Node ${nodeId} not found`);

  // Active learning: nudge toward game score at 25% weight
  // Retention check: if failing (score < 0.5) use stronger 35% weight to register the slip;
  //                  if passing use lighter 15% weight (no need to push above mastery aggressively)
  let weight: number;
  if (isRetentionCheck) {
    weight = gameScore < 0.5 ? 0.35 : 0.15;
  } else {
    weight = 0.25;
  }

  const rawDelta = (gameScore - node.masteryScore) * weight;
  // Active nodes: cap gain at +0.15 to prevent single-quiz mastery jumps
  // Retention failures: allow down to -0.20 so a forgotten skill is properly flagged
  const maxGain = 0.15;
  const maxLoss = isRetentionCheck && gameScore < 0.5 ? -0.20 : -0.15;
  const clampedDelta = Math.max(maxLoss, Math.min(maxGain, rawDelta));

  const newScore = Math.max(0, Math.min(1, node.masteryScore + clampedDelta));

  const sessionCount = await prisma.assessmentSession.count({
    where: { nodeId, userId },
  });
  const newStatus = calculateMasteryStatus(newScore, sessionCount + 1);
  const { interval, nextReviewAt } = calculateSpacedRepetition(newScore, node.reviewInterval);

  await prisma.skillNode.update({
    where: { id: nodeId },
    data: {
      masteryScore: newScore,
      masteryStatus: newStatus,
      lastPracticedAt: new Date(),
      nextReviewAt,
      reviewInterval: interval,
    },
  });

  return {
    nodeId,
    nodeName: node.name,
    oldScore: node.masteryScore,
    newScore,
    delta: clampedDelta,
  };
}
