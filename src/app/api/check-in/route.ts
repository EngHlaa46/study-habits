import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import {
  checkObservationComplete,
  calculateStabilityScore,
} from "@/lib/skills/progression";


export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();

  const validFocusLevels = ["none", "brief", "focused", "deep"];
  const validDecayPoints = ["<10m", "10-25m", "25-45m", "45-60m", "no_loss"];
  if (body.focusLevel && !validFocusLevels.includes(body.focusLevel)) {
    return NextResponse.json({ error: "Invalid focusLevel" }, { status: 400 });
  }
  if (body.decayPoint && !validDecayPoints.includes(body.decayPoint)) {
    return NextResponse.json({ error: "Invalid decayPoint" }, { status: 400 });
  }
  if (body.contextNote && body.contextNote.length > 1000) {
    return NextResponse.json({ error: "Context note too long" }, { status: 400 });
  }
  if (body.missReason && body.missReason.length > 500) {
    return NextResponse.json({ error: "Miss reason too long" }, { status: 400 });
  }
  const validMethods = ["explain", "qa", "mindmap", "notes", "record", "read"];
  if (body.studyMethod !== undefined && body.studyMethod !== null) {
    if (!Array.isArray(body.studyMethod) || body.studyMethod.some((m: unknown) => !validMethods.includes(m as string))) {
      return NextResponse.json({ error: "Invalid studyMethod" }, { status: 400 });
    }
  }
  if (body.energy !== undefined && body.energy !== null && (body.energy < 1 || body.energy > 5)) {
    return NextResponse.json({ error: "Energy must be 1–5" }, { status: 400 });
  }
  if (body.mood !== undefined && body.mood !== null && (body.mood < 1 || body.mood > 5)) {
    return NextResponse.json({ error: "Mood must be 1–5" }, { status: 400 });
  }
  if (body.aiResponses !== undefined && body.aiResponses !== null && typeof body.aiResponses !== "string") {
    return NextResponse.json({ error: "Invalid aiResponses" }, { status: 400 });
  }
  if (body.sessionDuration !== undefined && body.sessionDuration !== null &&
      (typeof body.sessionDuration !== "number" || body.sessionDuration < 0 || body.sessionDuration > 1440)) {
    return NextResponse.json({ error: "Invalid sessionDuration" }, { status: 400 });
  }
  if (body.pomodoroCount !== undefined && body.pomodoroCount !== null &&
      (typeof body.pomodoroCount !== "number" || body.pomodoroCount < 0 || body.pomodoroCount > 100)) {
    return NextResponse.json({ error: "Invalid pomodoroCount" }, { status: 400 });
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Determine the target date (body.date or today)
  let targetDate = now;
  if (body.date) {
    const parsed = new Date(body.date);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    parsed.setHours(0, 0, 0, 0);
    // Enforce max 3 days back
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    if (parsed < threeDaysAgo || parsed > now) {
      return NextResponse.json({ error: "Date must be within the last 3 days" }, { status: 400 });
    }
    targetDate = parsed;
  }

  // Check for existing check-in on the target date
  const dayAfter = new Date(targetDate);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const existing = await prisma.checkIn.findFirst({
    where: {
      userId,
      date: { gte: targetDate, lt: dayAfter },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already checked in for this day" },
      { status: 409 }
    );
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      userId,
      date: targetDate,
      initiated: body.initiated ?? false,
      focusLevel: body.focusLevel || null,
      decayPoint: body.decayPoint || null,
      contextNote: body.contextNote || null,
      atypical: body.atypical ?? false,
      energy: body.energy || null,
      mood: body.mood || null,
      backfilled: body.backfilled ?? false,
      sessionIntention: typeof body.sessionIntention === "string" && body.sessionIntention.trim()
        ? body.sessionIntention.trim().slice(0, 300)
        : null,
      sessionDuration: typeof body.sessionDuration === "number" ? body.sessionDuration : null,
      pomodoroCount: typeof body.pomodoroCount === "number" ? body.pomodoroCount : null,
      missReason: body.missReason || null,
      studyMethod: body.studyMethod?.length > 0 ? JSON.stringify(body.studyMethod) : null,
      aiResponses: body.aiResponses || null,
    },
  });

  // Update active phase day count
  await prisma.activePhase.updateMany({
    where: { userId },
    data: { dayCount: { increment: 1 } },
  });

  // Check for phase transitions
  const activePhase = await prisma.activePhase.findUnique({
    where: { userId },
  });

  if (activePhase?.phase === "observation") {
    const result = await checkObservationComplete(userId);
    if (result.advanced) {
      await prisma.activePhase.update({
        where: { userId },
        data: { phase: "skill_training" },
      });
    }
  }

  // Update stability score if there's an active skill
  const activeSkill = await prisma.skillProgress.findFirst({
    where: { userId, status: "active" },
  });

  if (activeSkill) {
    const recent = await prisma.checkIn.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 7,
    });
    const score = calculateStabilityScore(recent);
    await prisma.skillProgress.update({
      where: { id: activeSkill.id },
      data: { stabilityScore: score },
    });
  }

  return NextResponse.json({ checkIn }, { status: 201 });
}
