import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { EventsSection } from "@/components/history/EventsSection";
import { CalendarSyncSection } from "@/components/history/CalendarSyncSection";

export default async function EventsPage() {
  const session = await requireAuth();
  const userId = session.user.id;
  const now = new Date();

  const [rawEvents, profile] = await Promise.all([
    prisma.event.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  const events = rawEvents.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    date: e.date.toISOString().split("T")[0],
    status: e.date < now ? "passed" : "upcoming",
    notes: e.notes,
    examContent: e.examContent ?? null,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exams, deadlines, and upcoming milestones.
        </p>
      </div>
      <EventsSection initialEvents={events} />
      <CalendarSyncSection
        initialFeedUrl={profile?.calendarFeedUrl ?? null}
        initialLastSynced={profile?.calendarLastSynced?.toISOString() ?? null}
      />
    </div>
  );
}
