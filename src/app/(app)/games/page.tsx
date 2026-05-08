import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { GamesHero } from "@/components/games/GamesHero";
import { StandardGamesSection } from "@/components/games/StandardGamesSection";
import { CoachChallengesSection } from "@/components/games/CoachChallengesSection";
import { WeaknessesSection } from "@/components/games/WeaknessesSection";
import { autoAssignChallengeIfNeeded } from "@/lib/games/autoChallenge";
import type { GameChallengeClient } from "@/types/games";
import type { WeakNode } from "@/components/games/WeaknessesSection";

export default async function GamesPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  await autoAssignChallengeIfNeeded(userId);

  const [mostRecentTree, rawChallenges, rawWeakNodes] = await Promise.all([
    prisma.skillTree.findFirst({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      select: { id: true, materialName: true },
    }),
    (prisma.gameChallenge as { findMany: (args: object) => Promise<{
      id: string; gameType: string; title: string; description: string;
      nodeIds: string; difficulty: string; dueBy: Date | null;
      status: string; score: number | null; createdAt: Date;
    }[]> }).findMany({
      where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      orderBy: [{ dueBy: "asc" }, { createdAt: "desc" }],
    }).catch(() => []),
    prisma.skillNode.findMany({
      where: {
        skillTree: { userId },
        masteryStatus: { not: "locked" },
        masteryScore: { lt: 0.6 },
      },
      orderBy: { masteryScore: "asc" },
      take: 6,
      select: {
        id: true,
        name: true,
        masteryScore: true,
        skillTreeId: true,
        skillTree: { select: { materialName: true } },
      },
    }).catch(() => []),
  ]);

  const hasNodes = !!mostRecentTree;

  const challenges: GameChallengeClient[] = rawChallenges.map((c) => ({
    id: c.id,
    gameType: c.gameType as GameChallengeClient["gameType"],
    title: c.title,
    description: c.description,
    nodeIds: (() => { try { return JSON.parse(c.nodeIds) as string[]; } catch { return []; } })(),
    difficulty: c.difficulty as GameChallengeClient["difficulty"],
    dueBy: c.dueBy?.toISOString() ?? null,
    status: c.status as GameChallengeClient["status"],
    score: c.score,
    createdAt: c.createdAt.toISOString(),
  }));

  const weakNodes: WeakNode[] = rawWeakNodes.map((n) => ({
    id: n.id,
    name: n.name,
    masteryScore: n.masteryScore,
    skillTreeId: n.skillTreeId,
    skillTreeName: n.skillTree.materialName,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Games</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Play to grow your palm. Each correct answer waters it.
        </p>
      </div>

      <GamesHero
        skillTreeId={mostRecentTree?.id}
        skillTreeName={mostRecentTree?.materialName}
      />

      <WeaknessesSection nodes={weakNodes} />
      <CoachChallengesSection challenges={challenges} />
      <StandardGamesSection hasNodes={hasNodes} skillTreeId={mostRecentTree?.id} />
    </div>
  );
}
