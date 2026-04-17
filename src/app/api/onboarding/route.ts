import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { activateLevelSkills } from "@/lib/skills/progression";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();

  if (body.studyGoal && body.studyGoal.length > 500) {
    return NextResponse.json({ error: "Study goal too long" }, { status: 400 });
  }
  if (body.biggestChallenge && body.biggestChallenge.length > 500) {
    return NextResponse.json({ error: "Challenge description too long" }, { status: 400 });
  }
  if (body.typicalHours !== undefined && body.typicalHours !== null) {
    const hours = parseFloat(body.typicalHours);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      return NextResponse.json({ error: "typicalHours must be between 0 and 24" }, { status: 400 });
    }
  }
  if (body.eventName && body.eventName.length > 200) {
    return NextResponse.json({ error: "Event name too long" }, { status: 400 });
  }
  if (body.eventDate && isNaN(new Date(body.eventDate).getTime())) {
    return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
  }

  // Update profile with self-assessment
  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      selfAssessment: JSON.stringify({
        studyGoal: body.studyGoal,
        biggestChallenge: body.biggestChallenge,
        preferredTime: body.preferredTime,
        typicalHours: body.typicalHours,
      }),
      studyGoal: body.studyGoal,
      biggestChallenge: body.biggestChallenge,
      preferredTime: body.preferredTime,
      typicalStudyHours: body.typicalHours ? parseFloat(body.typicalHours) : null,
      onboardingComplete: true,
    },
    create: {
      userId,
      selfAssessment: JSON.stringify({
        studyGoal: body.studyGoal,
        biggestChallenge: body.biggestChallenge,
        preferredTime: body.preferredTime,
        typicalHours: body.typicalHours,
      }),
      studyGoal: body.studyGoal,
      biggestChallenge: body.biggestChallenge,
      preferredTime: body.preferredTime,
      typicalStudyHours: body.typicalHours ? parseFloat(body.typicalHours) : null,
      onboardingComplete: true,
    },
  });

  // Create event if provided
  if (body.eventName && body.eventDate) {
    await prisma.event.create({
      data: {
        userId,
        name: body.eventName,
        type: body.eventType || "exam",
        date: new Date(body.eventDate),
      },
    });
  }

  // Transition directly to skill_training (no observation gate)
  await prisma.activePhase.upsert({
    where: { userId },
    update: {
      phase: "skill_training",
      phaseStart: new Date(),
      dayCount: 0,
    },
    create: {
      userId,
      phase: "skill_training",
      phaseStart: new Date(),
      dayCount: 0,
    },
  });

  // Auto-activate all 3 Level 1 skills immediately
  await activateLevelSkills(userId, 1);

  return NextResponse.json({ success: true });
}
