import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Groq from "groq-sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { generateCheckInQuestions } from "@/lib/ai/dcs/checkInAgent";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ questions: [] }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [activeSkill, recentCheckIns, upcomingEvent] = await Promise.all([
      prisma.skillProgress.findFirst({
        where: { userId, status: "active" },
        include: { skill: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.checkIn.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 7,
        select: { initiated: true, date: true },
      }),
      prisma.event.findFirst({
        where: { userId, status: "upcoming", date: { gte: new Date() } },
        orderBy: { date: "asc" },
      }),
    ]);

    const weekLabels: Record<number, string> = { 1: "Stabilize", 2: "Express", 3: "Probe" };

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

    const questions = await generateCheckInQuestions(groq, {
      activeSkillName: activeSkill
        ? `${activeSkill.skill.name} (Week ${activeSkill.weekPhase} — ${weekLabels[activeSkill.weekPhase] ?? ""})`
        : undefined,
      weekPhase: activeSkill?.weekPhase ?? undefined,
      recentPattern,
      upcomingEvent: daysToEvent !== null ? `${upcomingEvent!.name} in ${daysToEvent} day${daysToEvent !== 1 ? "s" : ""}` : undefined,
    });

    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ questions: [] });
  }
}
