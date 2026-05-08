import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { CalendarGrid } from "@/components/history/CalendarGrid";
import { HistoryHeader } from "@/components/history/HistoryHeader";

export default async function HistoryPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [gameSessions, gameProfile] = await Promise.all([
    prisma.gameSession.findMany({
      where: { userId, createdAt: { gte: ninetyDaysAgo } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        gameType: true,
        score: true,
        xpAwarded: true,
        nodeIds: true,
      },
    }),
    prisma.userGameProfile.findUnique({
      where: { userId },
      select: { currentStreak: true },
    }),
  ]);

  // Group sessions by calendar date
  const dayMap = new Map<string, { count: number; totalScore: number; gameTypes: string[]; xp: number }>();
  const nodesLast30 = new Set<string>();

  for (const s of gameSessions) {
    const dateStr = s.createdAt.toISOString().split("T")[0];
    const existing = dayMap.get(dateStr) ?? { count: 0, totalScore: 0, gameTypes: [], xp: 0 };
    existing.count++;
    existing.totalScore += s.score;
    if (!existing.gameTypes.includes(s.gameType)) existing.gameTypes.push(s.gameType);
    existing.xp += s.xpAwarded;
    dayMap.set(dateStr, existing);

    if (s.createdAt >= thirtyDaysAgo) {
      try {
        const ids = JSON.parse(s.nodeIds) as string[];
        ids.forEach((id) => nodesLast30.add(id));
      } catch {}
    }
  }

  const gameDays = Array.from(dayMap.entries()).map(([date, d]) => ({
    date,
    sessionCount: d.count,
    avgScore: d.totalScore / d.count,
    gameTypes: d.gameTypes,
    xp: d.xp,
  }));

  const sessionsLast30 = gameSessions.filter((s) => s.createdAt >= thirtyDaysAgo).length;

  return (
    <div className="max-w-3xl mx-auto">
      <HistoryHeader
        totalSessions={sessionsLast30}
        nodesPracticed={nodesLast30.size}
        currentStreak={gameProfile?.currentStreak ?? 0}
      />
      <CalendarGrid gameDays={gameDays} />
    </div>
  );
}
