import { requireAuth } from "@/lib/session";
import { getAvailableSkills } from "@/lib/skills/progression";
import { prisma } from "@/lib/db/prisma";
import { SkillTree } from "@/components/skills/SkillTree";
import { SkillsPageHeader } from "@/components/skills/SkillsPageHeader";

export default async function SkillsPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const skills = await getAvailableSkills(userId);
  const activePhase = await prisma.activePhase.findUnique({
    where: { userId },
  });

  const hasActiveSkill = skills.some((s) => s.currentStatus === "active");
  const canActivate =
    activePhase?.phase === "skill_training" && !hasActiveSkill;

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
      <SkillTree skills={serialized} canActivate={canActivate} />
    </div>
  );
}
