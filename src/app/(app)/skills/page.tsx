import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { SkillTreeView } from "@/components/skills/SkillTreeView";

export default async function SkillsPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const skillTrees = await prisma.skillTree.findMany({
    where: { userId },
    include: {
      nodes: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { generatedAt: "desc" },
  });

  if (skillTrees.length === 0) {
    redirect("/onboarding?returning=true");
  }

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
      masteryStatus: node.masteryStatus,
      masteryScore: node.masteryScore,
      nextReviewAt: node.nextReviewAt?.toISOString() ?? null,
      lastPracticedAt: node.lastPracticedAt?.toISOString() ?? null,
      prerequisites: node.prerequisites,
    })),
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Skills</h1>
        <p className="text-muted-foreground/70 mt-1 text-sm">
          Your mastery map — built from your course material
        </p>
      </div>
      <SkillTreeView skillTrees={serialized} />
    </div>
  );
}
