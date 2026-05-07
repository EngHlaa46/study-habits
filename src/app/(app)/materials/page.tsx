import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { MaterialsClient } from "@/components/materials/MaterialsClient";

export default async function MaterialsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const raw = await prisma.skillTree.findMany({
    where: { userId: session.user.id },
    include: { nodes: { orderBy: { createdAt: "asc" } } },
    orderBy: { generatedAt: "desc" },
  });

  const skillTrees = raw.map((tree) => ({
    ...tree,
    generatedAt: tree.generatedAt.toISOString(),
    nodes: tree.nodes.map((node) => ({
      ...node,
      lastPracticedAt: node.lastPracticedAt?.toISOString() ?? null,
      nextReviewAt: node.nextReviewAt?.toISOString() ?? null,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    })),
  }));

  return <MaterialsClient initialSkillTrees={skillTrees} />;
}
