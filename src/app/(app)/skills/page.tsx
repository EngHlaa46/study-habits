import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { SkillTreeClient } from "@/components/skills/SkillTreeClient";

export default async function SkillsPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const skillTrees = await prisma.skillTree.findMany({
    where: { userId },
    include: { nodes: { orderBy: { createdAt: "asc" } } },
    orderBy: { generatedAt: "desc" },
  });

  const serialized = skillTrees.map((tree) => ({
    id: tree.id,
    materialName: tree.materialName,
    generatedAt: tree.generatedAt.toISOString(),
    nodes: tree.nodes.map((node) => ({
      id: node.id,
      localId: node.localId,
      name: node.name,
      description: node.description,
      whatMasteryLooksLike: node.whatMasteryLooksLike,
      suggestedEvalFormat: node.suggestedEvalFormat,
      prerequisites: node.prerequisites,
      masteryStatus: node.masteryStatus,
      masteryScore: node.masteryScore,
      nextReviewAt: node.nextReviewAt?.toISOString() ?? null,
      lastPracticedAt: node.lastPracticedAt?.toISOString() ?? null,
    })),
  }));

  return <SkillTreeClient initialSkillTrees={serialized} />;
}
