import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { CalendarGrid } from "@/components/history/CalendarGrid";
import { HistoryHeader } from "@/components/history/HistoryHeader";

export default async function HistoryPage() {
  const session = await requireAuth();

  const checkIns = await prisma.checkIn.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 90,
  });

  const serialized = checkIns.map((ci) => ({
    id: ci.id,
    date: ci.date.toISOString().split("T")[0],
    initiated: ci.initiated,
    focusLevel: ci.focusLevel,
    decayPoint: ci.decayPoint,
    contextNote: ci.contextNote,
    atypical: ci.atypical,
    energy: ci.energy,
    mood: ci.mood,
    backfilled: ci.backfilled,
  }));

  // Compute stats
  const last30 = serialized.slice(0, 30);
  const totalCheckIns = last30.length;
  const studiedDays = last30.filter((c) => c.initiated).length;
  const focusedDays = last30.filter(
    (c) => c.focusLevel === "focused" || c.focusLevel === "deep"
  ).length;

  return (
    <div className="max-w-3xl mx-auto">
      <HistoryHeader
        totalCheckIns={totalCheckIns}
        studiedDays={studiedDays}
        focusedDays={focusedDays}
      />
      <CalendarGrid checkIns={serialized} />
    </div>
  );
}
