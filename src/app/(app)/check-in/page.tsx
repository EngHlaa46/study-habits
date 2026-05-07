import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { CheckInForm } from "@/components/check-in/CheckInForm";
import { redirect } from "next/navigation";
import Groq from "groq-sdk";
import { generateCheckInQuestions } from "@/lib/ai/dcs/checkInAgent";
import type { CheckInQuestion } from "@/lib/ai/dcs/checkInAgent";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ intention?: string; duration?: string; pomodoros?: string }>;
}) {
  const session = await requireAuth();
  const userId = session.user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [existingEntry, existingLegacy, activeSkill, upcomingEvent, recentCheckIns] =
    await Promise.all([
      prisma.checkInEntry.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.checkIn.findFirst({ where: { userId, date: { gte: today, lt: tomorrow } } }),
      prisma.skillProgress.findFirst({
        where: { userId, status: "active" },
        include: { skill: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.event.findFirst({
        where: { userId, status: "upcoming", date: { gte: new Date() } },
        orderBy: { date: "asc" },
      }),
      prisma.checkIn.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 7,
        select: { initiated: true },
      }),
    ]);

  if (existingEntry || existingLegacy) redirect("/dashboard");

  const missedDays = recentCheckIns.filter((c) => !c.initiated).length;
  const recentPattern =
    recentCheckIns.length === 0
      ? undefined
      : missedDays >= 3
      ? `missed ${missedDays} of last ${recentCheckIns.length} days`
      : missedDays === 0
      ? "studied consistently recently"
      : `${recentCheckIns.length - missedDays}/${recentCheckIns.length} days studied recently`;

  const daysToEvent = upcomingEvent
    ? Math.ceil((upcomingEvent.date.getTime() - Date.now()) / 86400000)
    : null;

  const weekLabels: Record<number, string> = { 1: "Stabilize", 2: "Express", 3: "Probe" };

  let baselineQuestions: CheckInQuestion[] = [];
  try {
    baselineQuestions = await generateCheckInQuestions(groq, {
      activeSkillName: activeSkill
        ? `${activeSkill.skill.name} (Week ${activeSkill.weekPhase} — ${weekLabels[activeSkill.weekPhase] ?? ""})`
        : undefined,
      weekPhase: activeSkill?.weekPhase ?? undefined,
      recentPattern,
      upcomingEvent:
        daysToEvent !== null
          ? `${upcomingEvent!.name} in ${daysToEvent} day${daysToEvent !== 1 ? "s" : ""}`
          : undefined,
    });
  } catch {
    // falls back to default questions in the form
  }

  const params = await searchParams;
  const initialDuration = params.duration ? parseInt(params.duration, 10) || undefined : undefined;
  const initialPomodoros = params.pomodoros ? parseInt(params.pomodoros, 10) || undefined : undefined;

  return (
    <div className="max-w-lg mx-auto">
      <CheckInForm
        baselineQuestions={baselineQuestions}
        activeSkillSlug={activeSkill?.skill.slug}
        initialDuration={initialDuration}
        initialPomodoros={initialPomodoros}
      />
    </div>
  );
}
