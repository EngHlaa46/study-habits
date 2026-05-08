import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import {
  computePalmStage,
  computeDatesEarned,
  computeHealthDelta,
  clampHealth,
  computeStreakUpdate,
  computeStreakMultiplier,
  isDailyBonusAvailable,
} from "@/lib/games/palmStage";
import type { XPAwardRequest, XPAwardResult } from "@/types/gamification";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = (await req.json()) as XPAwardRequest;
  const { skillTreeId, correctAnswers, totalAnswers } = body;

  if (!skillTreeId) return NextResponse.json({ error: "skillTreeId required" }, { status: 400 });

  const now = new Date();

  // Fetch or create profile + palm in parallel
  const [rawProfile, rawPalm] = await Promise.all([
    prisma.userGameProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.skillPalm.upsert({
      where: { skillTreeId },
      create: { userId, skillTreeId },
      update: {},
    }),
  ]);

  // Streak
  const { newStreak, newLongest } = computeStreakUpdate(
    rawProfile.currentStreak,
    rawProfile.longestStreak,
    rawProfile.lastPlayedAt,
    now
  );
  const streakMultiplier = computeStreakMultiplier(newStreak);

  // Daily bonus (1.5x, applied once per day)
  const dailyBonus = isDailyBonusAvailable(rawProfile.dailyBonusUsedAt, now);
  const bonusMultiplier = dailyBonus ? 1.5 : 1.0;

  // XP = correct × 10 × streak × dailyBonus
  const baseXP = correctAnswers * 10;
  const xpAwarded = Math.round(baseXP * streakMultiplier * bonusMultiplier);

  // Palm updates
  const datesEarned = computeDatesEarned(correctAnswers);
  const healthDelta = computeHealthDelta(correctAnswers, totalAnswers);
  const oldPalmStage = computePalmStage(rawPalm.palmXP);
  const newPalmXP = rawPalm.palmXP + xpAwarded;
  const newPalmStage = computePalmStage(newPalmXP);
  const newHealth = clampHealth(rawPalm.health, healthDelta);

  // Persist all updates in parallel
  await Promise.all([
    prisma.userGameProfile.update({
      where: { userId },
      data: {
        totalXP: { increment: xpAwarded },
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastPlayedAt: now,
        ...(dailyBonus ? { dailyBonusUsedAt: now } : {}),
      },
    }),
    prisma.skillPalm.update({
      where: { skillTreeId },
      data: {
        palmXP: newPalmXP,
        totalDates: { increment: datesEarned },
        health: newHealth,
        lastWateredAt: now,
      },
    }),
  ]);

  const result: XPAwardResult = {
    xpAwarded,
    streakMultiplier,
    dailyBonus,
    newTotalXP: rawProfile.totalXP + xpAwarded,
    newPalmXP,
    oldPalmStage,
    newPalmStage,
    palmStageChanged: newPalmStage !== oldPalmStage,
    newStreak,
    datesEarned,
    healthDelta,
    newHealth,
  };

  return NextResponse.json(result);
}
