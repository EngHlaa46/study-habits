import { prisma } from "@/lib/db/prisma";

export interface ProgressionResult {
  advanced: boolean;
  reason: string;
  newPhase?: string;
  newWeek?: number;
}

// Week 1 (Stabilize): 4/7 days initiated
export async function checkWeek1Complete(
  userId: string,
  skillProgressId: string
): Promise<ProgressionResult> {
  const progress = await prisma.skillProgress.findUnique({
    where: { id: skillProgressId },
  });
  if (!progress || progress.weekPhase !== 1 || !progress.weekPhaseStart) {
    return { advanced: false, reason: "Not in week 1" };
  }

  const weekStart = progress.weekPhaseStart;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const now = new Date();

  const checkIns = await prisma.checkIn.findMany({
    where: {
      userId,
      date: { gte: weekStart, lte: now > weekEnd ? weekEnd : now },
      initiated: true,
    },
  });

  const daysPassed = Math.ceil(
    (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const maxDays = 10; // 7 + 3 extension

  if (checkIns.length >= 4 && daysPassed >= 7) {
    return {
      advanced: true,
      reason: `${checkIns.length}/4 initiated days in week 1`,
      newWeek: 2,
    };
  }

  if (daysPassed > maxDays) {
    return {
      advanced: false,
      reason:
        "Week 1 extended past maximum. AI should suggest task adjustment.",
    };
  }

  return {
    advanced: false,
    reason: `${checkIns.length}/4 initiated days (day ${daysPassed}/7)`,
  };
}

// Week 2 (Express): 5/7 days with positive focus signal
export async function checkWeek2Complete(
  userId: string,
  skillProgressId: string
): Promise<ProgressionResult> {
  const progress = await prisma.skillProgress.findUnique({
    where: { id: skillProgressId },
  });
  if (!progress || progress.weekPhase !== 2 || !progress.weekPhaseStart) {
    return { advanced: false, reason: "Not in week 2" };
  }

  const weekStart = progress.weekPhaseStart;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const now = new Date();

  const checkIns = await prisma.checkIn.findMany({
    where: {
      userId,
      date: { gte: weekStart, lte: now > weekEnd ? weekEnd : now },
      focusLevel: { in: ["focused", "deep"] },
    },
  });

  const daysPassed = Math.ceil(
    (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const maxDays = 10;

  if (checkIns.length >= 5 && daysPassed >= 7) {
    return {
      advanced: true,
      reason: `${checkIns.length}/5 positive focus days in week 2`,
      newWeek: 3,
    };
  }

  if (daysPassed > maxDays) {
    return {
      advanced: false,
      reason:
        "Week 2 extended past maximum. AI should suggest adjustment.",
    };
  }

  return {
    advanced: false,
    reason: `${checkIns.length}/5 positive focus days (day ${daysPassed}/7)`,
  };
}

// Week 3 (Probe): stability score >= 0.7
export async function checkWeek3Complete(
  userId: string,
  skillProgressId: string
): Promise<ProgressionResult> {
  const progress = await prisma.skillProgress.findUnique({
    where: { id: skillProgressId },
  });
  if (!progress || progress.weekPhase !== 3 || !progress.weekPhaseStart) {
    return { advanced: false, reason: "Not in week 3" };
  }

  const daysPassed = Math.ceil(
    (new Date().getTime() - progress.weekPhaseStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (progress.stabilityScore >= 0.7 && daysPassed >= 7) {
    return {
      advanced: true,
      reason: `Stability score ${progress.stabilityScore} >= 0.7`,
    };
  }

  const maxDays = 10;
  if (daysPassed > maxDays) {
    return {
      advanced: false,
      reason:
        "Week 3 extended past maximum. AI should suggest adjustment.",
    };
  }

  return {
    advanced: false,
    reason: `Stability score ${progress.stabilityScore}/0.7 (day ${daysPassed}/7)`,
  };
}

// Get skills for a user — level-based locking (no dependency edges)
export async function getAvailableSkills(userId: string) {
  const allSkills = await prisma.skill.findMany({
    include: {
      progresses: { where: { userId } },
    },
    orderBy: [{ level: "asc" }, { dimension: "asc" }],
  });

  // Determine the user's current active level
  const activeProgress = allSkills
    .flatMap((s) => s.progresses)
    .find((p) => p.status === "active");

  const currentLevel = activeProgress
    ? allSkills.find((s) => s.progresses.some((p) => p.id === activeProgress.id))?.level ?? 1
    : 1;

  return allSkills.map((skill) => {
    const progress = skill.progresses[0];
    const isCurrentLevel = skill.level === currentLevel;
    const isPastLevel = skill.level < currentLevel;
    const isFutureLevel = skill.level > currentLevel;

    let currentStatus: string;
    if (progress) {
      currentStatus = progress.status;
    } else if (isFutureLevel) {
      currentStatus = "locked";
    } else if (isCurrentLevel) {
      currentStatus = "available";
    } else {
      // past level with no progress record — shouldn't happen normally
      currentStatus = "available";
    }

    return {
      ...skill,
      currentStatus,
      progress,
    };
  });
}

// Advance a skill to the next week phase
export async function advanceWeekPhase(
  userId: string,
  skillProgressId: string
) {
  const progress = await prisma.skillProgress.findUnique({
    where: { id: skillProgressId },
  });
  if (!progress) return null;

  if (progress.weekPhase < 3) {
    return prisma.skillProgress.update({
      where: { id: skillProgressId },
      data: {
        weekPhase: progress.weekPhase + 1,
        weekPhaseStart: new Date(),
      },
    });
  }

  // Week 3 complete — mark as stable
  return prisma.skillProgress.update({
    where: { id: skillProgressId },
    data: {
      status: "stable",
      weekPhase: 3,
    },
  });
}

// Activate all 3 skills in a given level simultaneously
export async function activateLevelSkills(userId: string, level: number) {
  const levelSkills = await prisma.skill.findMany({ where: { level } });

  for (const skill of levelSkills) {
    await prisma.skillProgress.upsert({
      where: { userId_skillId: { userId, skillId: skill.id } },
      update: {
        status: "active",
        weekPhase: 1,
        weekPhaseStart: new Date(),
      },
      create: {
        userId,
        skillId: skill.id,
        status: "active",
        weekPhase: 1,
        weekPhaseStart: new Date(),
      },
    });
  }
}

// Check if all 3 skills in a level are stable or mastered
export async function checkLevelComplete(
  userId: string,
  level: number
): Promise<boolean> {
  const levelSkills = await prisma.skill.findMany({ where: { level } });
  if (levelSkills.length === 0) return false;

  const progresses = await prisma.skillProgress.findMany({
    where: {
      userId,
      skillId: { in: levelSkills.map((s) => s.id) },
    },
  });

  return (
    progresses.length === levelSkills.length &&
    progresses.every(
      (p) => p.status === "stable" || p.status === "mastered"
    )
  );
}

// Calculate a simple stability score based on recent check-ins
export function calculateStabilityScore(
  checkIns: { initiated: boolean; focusLevel: string | null; atypical: boolean }[]
): number {
  if (checkIns.length === 0) return 0;

  const relevant = checkIns.filter((c) => !c.atypical);
  if (relevant.length === 0) return 0;

  const initiatedRate = relevant.filter((c) => c.initiated).length / relevant.length;
  // brief counts as 0.5 — it signals initiation (the hardest act) even without sustained focus
  const focusScore = relevant.reduce((sum, c) => {
    if (c.focusLevel === "focused" || c.focusLevel === "deep") return sum + 1;
    if (c.focusLevel === "brief") return sum + 0.5;
    return sum;
  }, 0);
  const focusRate = focusScore / relevant.length;

  return Math.round((initiatedRate * 0.4 + focusRate * 0.6) * 100) / 100;
}
