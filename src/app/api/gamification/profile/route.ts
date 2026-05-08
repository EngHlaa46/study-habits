import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import {
  computeGlobalLevel,
  xpProgressToNextLevel,
  computePalmStage,
  isDailyBonusAvailable,
} from "@/lib/games/palmStage";
import type { GamificationProfile, SkillPalmState } from "@/types/gamification";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  const [rawProfile, rawPalms] = await Promise.all([
    prisma.userGameProfile.findUnique({ where: { userId } }),
    prisma.skillPalm.findMany({
      where: { userId },
      include: { skillTree: { select: { materialName: true } } },
    }),
  ]);

  const totalXP = rawProfile?.totalXP ?? 0;
  const currentStreak = rawProfile?.currentStreak ?? 0;
  const longestStreak = rawProfile?.longestStreak ?? 0;
  const lastPlayedAt = rawProfile?.lastPlayedAt ?? null;
  const dailyBonusUsedAt = rawProfile?.dailyBonusUsedAt ?? null;

  const profile = {
    totalXP,
    currentStreak,
    longestStreak,
    lastPlayedAt: lastPlayedAt?.toISOString() ?? null,
    dailyBonusAvailable: isDailyBonusAvailable(dailyBonusUsedAt, now),
    globalLevel: computeGlobalLevel(totalXP),
    xpToNextLevel: xpProgressToNextLevel(totalXP),
  };

  const palms: SkillPalmState[] = rawPalms.map((p) => {
    const lastWatered = p.lastWateredAt;
    const wateredToday = lastWatered
      ? lastWatered.toDateString() === now.toDateString()
      : false;
    return {
      skillTreeId: p.skillTreeId,
      skillTreeName: p.skillTree.materialName,
      palmXP: p.palmXP,
      totalDates: p.totalDates,
      health: p.health,
      stage: computePalmStage(p.palmXP),
      lastWateredAt: lastWatered?.toISOString() ?? null,
      wateredToday,
    };
  });

  const result: GamificationProfile = { profile, palms };
  return NextResponse.json(result);
}
