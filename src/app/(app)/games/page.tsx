import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { StandardGamesSection } from "@/components/games/StandardGamesSection";
import { CoachChallengesSection } from "@/components/games/CoachChallengesSection";
import type { GameChallengeClient } from "@/types/games";

export default async function GamesPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const [skillTrees, rawChallenges] = await Promise.all([
    prisma.skillTree.findMany({
      where: { userId },
      select: { id: true },
      take: 1,
    }),
    (prisma.gameChallenge as { findMany: (args: object) => Promise<{
      id: string; gameType: string; title: string; description: string;
      nodeIds: string; difficulty: string; dueBy: Date | null;
      status: string; score: number | null; createdAt: Date;
    }[]> }).findMany({
      where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      orderBy: [{ dueBy: "asc" }, { createdAt: "desc" }],
    }).catch(() => []),
  ]);

  const hasNodes = skillTrees.length > 0;

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

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Games</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Practice through play. Game results update your mastery scores.
        </p>
      </div>

      <CoachChallengesSection challenges={challenges} />
      <StandardGamesSection hasNodes={hasNodes} />
    </div>
  );
}
