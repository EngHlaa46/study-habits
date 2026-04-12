import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ToolsPageClient } from "@/components/tools/ToolsPageClient";

export default async function ToolsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const skillProgresses = await prisma.skillProgress.findMany({
    where: { userId: session.user.id },
    include: { skill: true },
  });

  const dimScores: Record<string, number> = { behavioral: 0, cognitive: 0, metacognitive: 0 };
  const dimCounts: Record<string, number> = { behavioral: 0, cognitive: 0, metacognitive: 0 };
  for (const sp of skillProgresses) {
    const dim = (sp.skill as unknown as { dimension?: string | null }).dimension;
    if (dim && dim in dimScores) {
      dimScores[dim] += sp.stabilityScore;
      dimCounts[dim]++;
    }
  }
  const dimAvg: Record<string, number> = {};
  for (const dim of Object.keys(dimScores)) {
    dimAvg[dim] = dimCounts[dim] > 0 ? dimScores[dim] / dimCounts[dim] : 0;
  }
  const weakestDim = Object.entries(dimAvg).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;

  return <ToolsPageClient weakestDim={weakestDim} />;
}
