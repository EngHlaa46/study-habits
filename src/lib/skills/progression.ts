import { prisma } from "@/lib/db/prisma";

export interface ProgressionResult {
  advanced: boolean;
  reason: string;
  newPhase?: string;
  newWeek?: number;
}

// Observation phase: 5+ check-ins in 7 days
export async function checkObservationComplete(
  userId: string
): Promise<ProgressionResult> {
  const activePhase = await prisma.activePhase.findUnique({
    where: { userId },
  });
  if (!activePhase || activePhase.phase !== "observation") {
    return { advanced: false, reason: "Not in observation phase" };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const checkInCount = await prisma.checkIn.count({
    where: {
      userId,
      date: { gte: sevenDaysAgo },
    },
  });

  if (checkInCount >= 5) {
    return {
      advanced: true,
      reason: `${checkInCount}/5 check-ins completed in observation window`,
      newPhase: "skill_training",
    };
  }

  // Relaxed path: if 10+ days have passed and user has 3+ total check-ins since phase start
  const daysSinceStart = Math.ceil(
    (Date.now() - activePhase.phaseStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceStart >= 10) {
    const totalCheckIns = await prisma.checkIn.count({
      where: {
        userId,
        date: { gte: activePhase.phaseStart },
      },
    });
    if (totalCheckIns >= 3) {
      return {
        advanced: true,
        reason: `${totalCheckIns} check-ins over ${daysSinceStart} days — relaxed threshold met`,
        newPhase: "skill_training",
      };
    }
  }

  return {
    advanced: false,
    reason: `${checkInCount}/5 check-ins completed. Need ${5 - checkInCount} more.`,
  };
}

// Week 1 (Stabilize): 4/7 days initiated + skill practiced
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

// Week 3 (Probe): AI readiness score >= 0.7
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

// Get available skills for a user (prerequisites all mastered/stable)
export async function getAvailableSkills(userId: string) {
  const allSkills = await prisma.skill.findMany({
    include: {
      dependsOn: { include: { prerequisite: true } },
      progresses: { where: { userId } },
    },
    orderBy: { tier: "asc" },
  });

  return allSkills.map((skill) => {
    const progress = skill.progresses[0];
    const prereqsMet = skill.dependsOn.every((dep) => {
      const preSkill = allSkills.find(
        (s) => s.id === dep.prerequisiteId
      );
      const preProgress = preSkill?.progresses[0];
      return (
        preProgress &&
        (preProgress.status === "stable" || preProgress.status === "mastered")
      );
    });

    const currentStatus = progress?.status || (prereqsMet && skill.dependsOn.length === 0 ? "available" : prereqsMet ? "available" : "locked");

    return {
      ...skill,
      currentStatus,
      prereqsMet,
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

// Activate a skill for training
export async function activateSkill(userId: string, skillId: string) {
  // Ensure no other skill is active
  await prisma.skillProgress.updateMany({
    where: { userId, status: "active" },
    data: { status: "available" },
  });

  const existing = await prisma.skillProgress.findUnique({
    where: { userId_skillId: { userId, skillId } },
  });

  const skillProgress = existing
    ? await prisma.skillProgress.update({
        where: { id: existing.id },
        data: {
          status: "active",
          weekPhase: 1,
          weekPhaseStart: new Date(),
        },
      })
    : await prisma.skillProgress.create({
        data: {
          userId,
          skillId,
          status: "active",
          weekPhase: 1,
          weekPhaseStart: new Date(),
        },
      });

  // Update active phase
  await prisma.activePhase.upsert({
    where: { userId },
    update: {
      phase: "skill_training",
      activeSkillId: skillId,
    },
    create: {
      userId,
      phase: "skill_training",
      activeSkillId: skillId,
    },
  });

  return skillProgress;
}

// Calculate a simple stability score based on recent check-ins
export function calculateStabilityScore(
  checkIns: { initiated: boolean; focusLevel: string | null; atypical: boolean }[]
): number {
  if (checkIns.length === 0) return 0;

  const relevant = checkIns.filter((c) => !c.atypical);
  if (relevant.length === 0) return 0;

  const initiatedRate = relevant.filter((c) => c.initiated).length / relevant.length;
  const focusRate =
    relevant.filter(
      (c) => c.focusLevel === "focused" || c.focusLevel === "deep"
    ).length / relevant.length;

  return Math.round((initiatedRate * 0.4 + focusRate * 0.6) * 100) / 100;
}
