import { prisma } from "@/lib/db/prisma";
import type { ActivePhase, CheckIn, Event, SkillProgress, Skill, UserProfile } from "@prisma/client";

export interface UserData {
  userName: string | null;
  activePhase: ActivePhase | null;
  recentCheckIns: CheckIn[];
  skillProgresses: (SkillProgress & { skill: Skill })[];
  upcomingEvents: Event[];
  profile: UserProfile | null;
}

export async function fetchUserData(userId: string): Promise<UserData> {
  const [user, activePhase, recentCheckIns, skillProgresses, upcomingEvents, profile] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.activePhase.findUnique({ where: { userId } }),
      prisma.checkIn.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 14,
      }),
      prisma.skillProgress.findMany({
        where: { userId },
        include: { skill: true },
      }),
      prisma.event.findMany({
        where: { userId, status: "upcoming" },
        orderBy: { date: "asc" },
        take: 3,
      }),
      prisma.userProfile.findUnique({ where: { userId } }),
    ]);

  return {
    userName: user?.name ?? null,
    activePhase,
    recentCheckIns,
    skillProgresses: skillProgresses as (SkillProgress & { skill: Skill })[],
    upcomingEvents,
    profile,
  };
}

export function buildContextFromData(data: UserData): string {
  const { userName, activePhase, recentCheckIns, skillProgresses, upcomingEvents, profile } = data;
  const lines: string[] = [];

  if (userName) {
    lines.push(`Student name: ${userName}`);
  }

  if (activePhase) {
    const daysSincePhaseStart = Math.ceil(
      (Date.now() - activePhase.phaseStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    lines.push(`Current phase: ${activePhase.phase} (day ${daysSincePhaseStart})`);
  }

  const activeSkill = skillProgresses.find((sp) => sp.status === "active");
  if (activeSkill) {
    const weekLabels: Record<number, string> = { 1: "Stabilize", 2: "Express", 3: "Probe" };
    lines.push(
      `Active skill: ${activeSkill.skill.name} — Week ${activeSkill.weekPhase} (${weekLabels[activeSkill.weekPhase] || "Not started"})`
    );
    if (activeSkill.userTask) lines.push(`User-defined task: ${activeSkill.userTask}`);
    lines.push(`Stability score: ${activeSkill.stabilityScore}`);
  }

  lines.push("\nSkill statuses:");
  for (const sp of skillProgresses) {
    lines.push(`  - ${sp.skill.name} (Tier ${sp.skill.tier}): ${sp.status}`);
  }

  const dimGroups: Record<string, { scores: number[]; statuses: string[] }> = {};
  for (const sp of skillProgresses) {
    const dim = (sp.skill as unknown as { dimension?: string | null }).dimension;
    if (!dim) continue;
    if (!dimGroups[dim]) dimGroups[dim] = { scores: [], statuses: [] };
    dimGroups[dim].statuses.push(sp.status);
    if (["active", "stable", "mastered"].includes(sp.status)) {
      dimGroups[dim].scores.push(sp.stabilityScore);
    }
  }
  const dimSummary = Object.entries(dimGroups).map(([dim, { scores, statuses }]) => {
    const allLocked = statuses.every((s) => s === "locked");
    if (allLocked) return `${dim}=locked`;
    const avg = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
      : "0.00";
    const hasStable = statuses.includes("stable") || statuses.includes("mastered");
    const hasActive = statuses.includes("active");
    const label = hasStable ? "strong" : hasActive ? "developing" : "early";
    return `${dim}=${label}(${avg})`;
  });
  if (dimSummary.length > 0) {
    lines.push(`Dimension profile: ${dimSummary.join(", ")}`);
  }

  if (recentCheckIns.length > 0) {
    lines.push(`\nLast ${recentCheckIns.length} check-ins:`);
    for (const ci of recentCheckIns.slice(0, 7)) {
      const dateStr = ci.date.toISOString().split("T")[0];
      let methods: string[] = [];
      try {
        if (ci.studyMethod) methods = JSON.parse(ci.studyMethod);
      } catch { /* ignore */ }
      const parts = [
        `date=${dateStr}`,
        `studied=${ci.initiated}`,
        ci.focusLevel ? `focus=${ci.focusLevel}` : null,
        ci.decayPoint ? `decay=${ci.decayPoint}` : null,
        methods.length > 0 ? `methods=${methods.join("+")}` : null,
        ci.atypical ? "ATYPICAL" : null,
        ci.energy ? `energy=${ci.energy}/5` : null,
        ci.mood ? `mood=${ci.mood}/5` : null,
        ci.missReason ? `missed_because=${ci.missReason}` : null,
        ci.sessionIntention ? `intention="${ci.sessionIntention}"` : null,
      ].filter(Boolean);
      lines.push(`  ${parts.join(", ")}`);
    }

    const last7 = recentCheckIns.slice(0, 7);
    const initiated = last7.filter((c) => c.initiated).length;
    const focused = last7.filter((c) => c.focusLevel === "focused" || c.focusLevel === "deep").length;
    lines.push(`\n7-day summary: ${initiated}/7 initiated, ${focused}/7 focused+`);

    const emotionalReasons = new Set(["Felt overwhelmed", "Wasn't in the mood"]);
    const missReasonCount: Record<string, number> = {};
    for (const ci of recentCheckIns) {
      if (ci.missReason) {
        missReasonCount[ci.missReason] = (missReasonCount[ci.missReason] ?? 0) + 1;
      }
    }
    const repeatedReasons = Object.entries(missReasonCount).filter(([, count]) => count >= 3);
    if (repeatedReasons.length > 0) {
      const pattern = repeatedReasons
        .map(([reason, count]) => {
          const type = emotionalReasons.has(reason) ? "emotional" : "logistical";
          return `"${reason}" (${count}/${recentCheckIns.length} days, ${type})`;
        })
        .join(", ");
      lines.push(`Procrastination pattern: ${pattern}`);
    }

    const methodFocusMap: Record<string, { total: number; focused: number }> = {};
    for (const ci of last7) {
      let methods: string[] = [];
      try {
        if (ci.studyMethod) methods = JSON.parse(ci.studyMethod);
      } catch { /* ignore */ }
      for (const m of methods) {
        if (!methodFocusMap[m]) methodFocusMap[m] = { total: 0, focused: 0 };
        methodFocusMap[m].total++;
        if (ci.focusLevel === "focused" || ci.focusLevel === "deep") {
          methodFocusMap[m].focused++;
        }
      }
    }
    const methodEntries = Object.entries(methodFocusMap);
    if (methodEntries.length > 0) {
      const summary = methodEntries
        .map(([m, s]) => `${m}(${s.focused}/${s.total} focused)`)
        .join(", ");
      lines.push(`Study method performance: ${summary}`);
    }
  }

  if (upcomingEvents.length > 0) {
    lines.push("\nUpcoming events:");
    for (const event of upcomingEvents) {
      const daysUntil = Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      lines.push(`  - ${event.name} (${event.type}) in ${daysUntil} days`);
    }
  }

  if (profile?.selfAssessment) {
    try {
      const sa = JSON.parse(profile.selfAssessment);
      lines.push("\nSelf-assessment:");
      if (sa.studyGoal) lines.push(`  Goal: ${sa.studyGoal}`);
      if (sa.biggestChallenge) {
        try {
          const challenges = JSON.parse(sa.biggestChallenge);
          if (Array.isArray(challenges)) {
            lines.push(`  Biggest challenges: ${challenges.join(", ")}`);
          } else {
            lines.push(`  Biggest challenge: ${sa.biggestChallenge}`);
          }
        } catch {
          lines.push(`  Biggest challenge: ${sa.biggestChallenge}`);
        }
      }
      if (sa.preferredTime) lines.push(`  Preferred study time: ${sa.preferredTime}`);
    } catch { /* ignore */ }
  }

  return lines.join("\n");
}

// Backward-compatible wrapper used by notifications and other callers
export async function buildUserContext(userId: string): Promise<string> {
  const data = await fetchUserData(userId);
  return buildContextFromData(data);
}
