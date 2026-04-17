/**
 * One-time migration: reset all user skill progress to the new 3-level parallel architecture.
 *
 * Run AFTER prisma db push + prisma db seed:
 *   npx tsx scripts/migrate-skill-architecture.ts
 *
 * This script:
 * 1. Deletes all existing SkillProgress records (old tier-based slugs are now gone)
 * 2. For users in "observation" phase: advances them to "skill_training" and activates Level 1
 * 3. For users in "skill_training" phase: re-initializes Level 1 skills as active
 * 4. For users in "onboarding" phase: initializes Level 1 skills as "available"
 *    (they will be activated when onboarding completes)
 */

import { PrismaClient } from "@prisma/client";
import { activateLevelSkills } from "../src/lib/skills/progression";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting skill architecture migration...");

  // 1. Clear all existing SkillProgress records
  const deleted = await prisma.skillProgress.deleteMany({});
  console.log(`Deleted ${deleted.count} SkillProgress records.`);

  // 2. Get all users with their active phases
  const activePhases = await prisma.activePhase.findMany({});
  console.log(`Found ${activePhases.length} users to migrate.`);

  const level1Skills = await prisma.skill.findMany({ where: { level: 1 } });
  const level2PlusSkills = await prisma.skill.findMany({ where: { level: { gt: 1 } } });

  for (const ap of activePhases) {
    const userId = ap.userId;

    if (ap.phase === "onboarding") {
      // Initialize level 1 as available, rest as locked
      for (const skill of level1Skills) {
        await prisma.skillProgress.create({
          data: { userId, skillId: skill.id, status: "available" },
        });
      }
      for (const skill of level2PlusSkills) {
        await prisma.skillProgress.create({
          data: { userId, skillId: skill.id, status: "locked" },
        });
      }
      console.log(`  [onboarding] ${userId}: Level 1 available, rest locked.`);

    } else if (ap.phase === "observation") {
      // Advance to skill_training and activate Level 1
      await prisma.activePhase.update({
        where: { userId },
        data: { phase: "skill_training" },
      });
      // Initialize locked for level 2+
      for (const skill of level2PlusSkills) {
        await prisma.skillProgress.create({
          data: { userId, skillId: skill.id, status: "locked" },
        });
      }
      await activateLevelSkills(userId, 1);
      console.log(`  [observation→skill_training] ${userId}: Level 1 activated.`);

    } else if (ap.phase === "skill_training") {
      // Re-initialize: Level 1 active, rest locked
      for (const skill of level2PlusSkills) {
        await prisma.skillProgress.create({
          data: { userId, skillId: skill.id, status: "locked" },
        });
      }
      await activateLevelSkills(userId, 1);
      console.log(`  [skill_training] ${userId}: Level 1 re-activated.`);
    }
  }

  console.log("\nMigration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
