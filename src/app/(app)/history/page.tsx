import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { CalendarGrid } from "@/components/history/CalendarGrid";
import { HistoryHeader } from "@/components/history/HistoryHeader";
import { EventsSection } from "@/components/history/EventsSection";
import { CalendarSyncSection } from "@/components/history/CalendarSyncSection";

export default async function HistoryPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const now = new Date();

  const [checkIns, rawEvents, profile] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 90,
    }),
    prisma.event.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

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

  // Auto-resolve event status server-side
  const events = rawEvents.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    date: e.date.toISOString().split("T")[0],
    status: e.date < now ? "passed" : "upcoming",
    notes: e.notes,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <HistoryHeader
        totalCheckIns={totalCheckIns}
        studiedDays={studiedDays}
        focusedDays={focusedDays}
      />
      <CalendarGrid checkIns={serialized} />
      <EventsSection initialEvents={events} />
      <CalendarSyncSection
        initialFeedUrl={profile?.calendarFeedUrl ?? null}
        initialLastSynced={profile?.calendarLastSynced?.toISOString() ?? null}
      />
    </div>
  );
}
