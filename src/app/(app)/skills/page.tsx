import { requireAuth } from "@/lib/session";
import { getAvailableSkills } from "@/lib/skills/progression";
import { prisma } from "@/lib/db/prisma";
import { SkillTree } from "@/components/skills/SkillTree";
import { SkillsPageHeader } from "@/components/skills/SkillsPageHeader";
import { ActivePlanCard } from "@/components/dashboard/ActivePlanCard";
import { DimensionProfileCard } from "@/components/dashboard/DimensionProfileCard";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

const WeeklyTrendChart = dynamic(
  () => import("@/components/dashboard/WeeklyTrendChart").then((m) => ({ default: m.WeeklyTrendChart })),
  { ssr: false, loading: () => <div className="h-48 bg-card rounded-xl animate-pulse" /> }
);

export default async function SkillsPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const [skills, activePhase, profile, skillProgresses, recentCheckIns] = await Promise.all([
    getAvailableSkills(userId),
    prisma.activePhase.findUnique({ where: { userId } }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.skillProgress.findMany({ where: { userId }, include: { skill: true } }),
    prisma.checkIn.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 14 }),
  ]);

  const phase = activePhase?.phase || "onboarding";
  const hasActiveSkill = skills.some((s) => s.currentStatus === "active");
  const canActivate = phase === "skill_training" && !hasActiveSkill;

  const activeSkillProgress = skillProgresses.find((sp) => sp.status === "active");

  let challenges: string[] = [];
  if (profile?.biggestChallenge) {
    try {
      const parsed = JSON.parse(profile.biggestChallenge);
      challenges = Array.isArray(parsed) ? parsed : [profile.biggestChallenge];
    } catch {
      challenges = [profile.biggestChallenge];
    }
  }

  const trendCheckIns = recentCheckIns.map((ci) => ({
    date: ci.date.toISOString().split("T")[0],
    initiated: ci.initiated,
    focusLevel: ci.focusLevel,
  }));

  const dimensionSkills = skillProgresses.map((sp) => ({
    dimension: sp.skill.dimension ?? null,
    status: sp.status,
    stabilityScore: sp.stabilityScore,
  }));

  const serialized = skills.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    tier: s.tier,
    description: s.description,
    purpose: s.purpose,
    currentStatus: s.currentStatus,
    prereqsMet: s.prereqsMet,
    prerequisites: s.dependsOn.map((dep) => {
      const prereqSkill = skills.find((sk) => sk.id === dep.prerequisiteId);
      return {
        name: dep.prerequisite.name,
        slug: dep.prerequisite.slug,
        met:
          prereqSkill?.currentStatus === "stable" ||
          prereqSkill?.currentStatus === "mastered",
      };
    }),
    progress: s.progress
      ? {
          weekPhase: s.progress.weekPhase,
          stabilityScore: s.progress.stabilityScore,
          userTask: s.progress.userTask,
        }
      : null,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <SkillsPageHeader />

      {/* Current skill plan — visible during active skill training */}
      {phase === "skill_training" && activeSkillProgress && (
        <>
          <ActivePlanCard
            skillName={activeSkillProgress.skill.name}
            skillDescription={activeSkillProgress.skill.description}
            weekPhase={activeSkillProgress.weekPhase}
            challenges={challenges}
            userTask={activeSkillProgress.userTask ?? null}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <DimensionProfileCard skills={dimensionSkills} />
            <div className="flex flex-col gap-3">
              <WeeklyTrendChart checkIns={trendCheckIns} />
              <Link
                href="/chat"
                className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-primary transition-colors self-end"
              >
                <MessageSquare size={12} />
                Discuss performance with AI
              </Link>
            </div>
          </div>
        </>
      )}

      <SkillTree skills={serialized} canActivate={canActivate} />
    </div>
  );
}
