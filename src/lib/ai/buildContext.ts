import { prisma } from "@/lib/db/prisma";
import type { ActivePhase, Event, SkillProgress, Skill, UserProfile, KnowledgeEntry, SkillNode, SkillTree, AssessmentSession } from "@prisma/client";

export interface UserData {
  userName: string | null;
  activePhase: ActivePhase | null;
  skillProgresses: (SkillProgress & { skill: Skill })[];
  upcomingEvents: Event[];
  profile: UserProfile | null;
  knowledgeProfile: KnowledgeEntry[];
  skillTrees: (SkillTree & { nodes: SkillNode[] })[];
  recentAssessments: (AssessmentSession & { node: SkillNode })[];
  pendingChallenges: { gameType: string; title: string; dueBy: Date | null; difficulty: string }[];
}

export async function fetchUserData(userId: string): Promise<UserData> {
  const [user, activePhase, skillProgresses, upcomingEvents, profile, knowledgeProfile, skillTrees, recentAssessments, pendingChallenges] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.activePhase.findUnique({ where: { userId } }),
      prisma.skillProgress.findMany({ where: { userId }, include: { skill: true } }),
      prisma.event.findMany({ where: { userId, status: "upcoming" }, orderBy: { date: "asc" }, take: 3 }),
      prisma.userProfile.findUnique({ where: { userId } }),
      (prisma.knowledgeEntry as { findMany: (args: object) => Promise<KnowledgeEntry[]> }).findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      prisma.skillTree.findMany({
        where: { userId },
        include: { nodes: { orderBy: { masteryScore: "desc" } } },
        orderBy: { generatedAt: "desc" },
        take: 3,
      }),
      (async () => {
        const sessions = await prisma.assessmentSession.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        const nodeIds = Array.from(new Set(sessions.map((s) => s.nodeId)));
        const nodes = await prisma.skillNode.findMany({ where: { id: { in: nodeIds } } });
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));
        return sessions.map((s) => ({ ...s, node: nodeMap.get(s.nodeId) as SkillNode }));
      })() as Promise<(AssessmentSession & { node: SkillNode })[]>,
      (prisma.gameChallenge as { findMany: (args: object) => Promise<{ gameType: string; title: string; dueBy: Date | null; difficulty: string }[]> }).findMany({
        where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }).catch(() => [] as { gameType: string; title: string; dueBy: Date | null; difficulty: string }[]),
    ]);

  return {
    userName: user?.name ?? null,
    activePhase,
    skillProgresses: skillProgresses as (SkillProgress & { skill: Skill })[],
    upcomingEvents,
    profile,
    knowledgeProfile: knowledgeProfile ?? [],
    skillTrees: skillTrees as (SkillTree & { nodes: SkillNode[] })[],
    recentAssessments: recentAssessments ?? [],
    pendingChallenges: pendingChallenges ?? [],
  };
}

export function buildContextFromData(data: UserData): string {
  const { userName, activePhase, skillProgresses, upcomingEvents, profile, knowledgeProfile } = data;
  const lines: string[] = [];

  if (userName) lines.push(`Student name: ${userName}`);

  if (activePhase) {
    const daysSinceStart = Math.ceil(
      (Date.now() - activePhase.phaseStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    lines.push(`Current phase: ${activePhase.phase} (day ${daysSinceStart})`);
  }

  // Old-style fixed skill progresses (kept for backward compat)
  const activeSkills = skillProgresses.filter((sp) => sp.status === "active");
  if (activeSkills.length > 0) {
    const weekLabels: Record<number, string> = { 1: "Stabilize", 2: "Express", 3: "Probe" };
    const activeLevel = activeSkills[0].skill.level;
    lines.push(`Active level: Level ${activeLevel} — training ${activeSkills.length} skills in parallel`);
    for (const sp of activeSkills) {
      const dimLabel = sp.skill.dimension ?? "unknown";
      lines.push(
        `  [${dimLabel}] ${sp.skill.name} — Week ${sp.weekPhase} (${weekLabels[sp.weekPhase] || "Not started"}), stability ${sp.stabilityScore}`
      );
      if (sp.userTask) lines.push(`    Task: ${sp.userTask}`);
    }
  }

  if (upcomingEvents.length > 0) {
    lines.push("\nUpcoming events:");
    for (const event of upcomingEvents) {
      const daysUntil = Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      lines.push(`  - ${event.name} (${event.type}) in ${daysUntil} days`);
    }
  }

  if (profile?.studyGoal) lines.push(`\nStudy goal: ${profile.studyGoal}`);

  // Knowledge profile
  if (knowledgeProfile.length > 0) {
    lines.push("\nKnowledge profile:");
    const bySubject: Record<string, KnowledgeEntry[]> = {};
    for (const e of knowledgeProfile) {
      if (!bySubject[e.subject]) bySubject[e.subject] = [];
      bySubject[e.subject].push(e);
    }
    for (const [subject, entries] of Object.entries(bySubject)) {
      for (const e of entries) {
        const note = e.notes ? ` — ${e.notes}` : "";
        lines.push(`  - ${subject} / ${e.topic}: ${e.status}${note}`);
      }
    }
  }

  // AI-generated skill trees
  const { skillTrees, recentAssessments } = data;
  if (skillTrees.length > 0) {
    lines.push("\nSkill trees (from uploaded materials):");
    for (const tree of skillTrees) {
      const active = tree.nodes.filter((n) => n.masteryStatus === "active" || n.masteryStatus === "developing");
      const mastered = tree.nodes.filter((n) => n.masteryStatus === "mastered" || n.masteryStatus === "maintenance");
      lines.push(`  [${tree.materialName}] ${tree.nodes.length} nodes — ${active.length} active, ${mastered.length} mastered`);
      for (const node of tree.nodes.slice(0, 6)) {
        const due = node.nextReviewAt && node.nextReviewAt <= new Date() ? " [DUE]" : "";
        lines.push(`    - ${node.name}: ${node.masteryStatus} (${Math.round(node.masteryScore * 100)}%)${due}`);
      }
    }
  }

  if (recentAssessments.length > 0) {
    lines.push("\nRecent assessment sessions:");
    for (const s of recentAssessments.slice(0, 5)) {
      const date = s.createdAt.toISOString().split("T")[0];
      lines.push(`  ${date} | ${s.node.name} | delta: ${s.masteryDelta > 0 ? "+" : ""}${s.masteryDelta.toFixed(2)} | calibration: ${Math.round(s.calibrationScore * 100)}%`);
      if (s.weaknesses) lines.push(`    Weakness: ${s.weaknesses}`);
    }
  }

  // Pending game challenges
  const { pendingChallenges } = data;
  if (pendingChallenges.length > 0) {
    lines.push("\nPending game challenges:");
    for (const c of pendingChallenges) {
      const due = c.dueBy ? ` — due ${c.dueBy.toISOString().split("T")[0]}` : "";
      lines.push(`  - ${c.title} (${c.gameType}, ${c.difficulty})${due}`);
    }
  }

  // Coaching preferences
  const coachingStyle = (profile as unknown as { coachingStyle?: string | null })?.coachingStyle;
  const motivationalFrame = (profile as unknown as { motivationalFrame?: string | null })?.motivationalFrame;
  const phoneUsageHours = (profile as unknown as { phoneUsageHours?: number | null })?.phoneUsageHours;

  if (coachingStyle || motivationalFrame || phoneUsageHours != null) {
    lines.push("\nCoaching preferences:");
    if (coachingStyle) lines.push(`  Style: ${coachingStyle === "socratic" ? "Socratic" : "Direct"}`);
    if (motivationalFrame) lines.push(`  Motivation: ${motivationalFrame === "exam" ? "Exam-focused" : "Intrinsic"}`);
    if (phoneUsageHours != null) lines.push(`  Avg daily phone screen time: ${phoneUsageHours}h`);
  }

  return lines.join("\n");
}

// Backward-compatible wrapper
export async function buildUserContext(userId: string): Promise<string> {
  const data = await fetchUserData(userId);
  return buildContextFromData(data);
}
