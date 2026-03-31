import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const skills = [
  {
    slug: "task-clarity",
    name: "Task Clarity",
    tier: 1,
    dimension: "behavioral",
    description:
      "Define exactly what you will study before you begin. Convert vague intentions into concrete tasks.",
    purpose:
      "Most study sessions fail before they start because the student sits down without knowing what to do. This skill removes that ambiguity.",
    icon: "target",
  },
  {
    slug: "initiation",
    name: "Initiation",
    tier: 1,
    dimension: "behavioral",
    description:
      "Start studying within 5 minutes of your planned time. The goal is simply to begin, not to sustain.",
    purpose:
      "Starting is the hardest part. This skill isolates the act of beginning from everything else.",
    icon: "play",
  },
  {
    slug: "focus-containment",
    name: "Focus Containment",
    tier: 2,
    dimension: "cognitive",
    description:
      "Maintain focused attention for a defined short block (15-25 minutes) without switching tasks.",
    purpose:
      "Once you can start, you need to stay. This skill builds the minimum viable focus window.",
    icon: "eye",
  },
  {
    slug: "environment-control",
    name: "Environment Control",
    tier: 2,
    dimension: "cognitive",
    description:
      "Set up your study space to minimize distractions before you begin. Phone away, tabs closed, materials ready.",
    purpose:
      "Your environment either supports focus or destroys it. This skill makes the choice intentional.",
    icon: "shield",
  },
  {
    slug: "focus-endurance",
    name: "Focus Endurance",
    tier: 3,
    dimension: "cognitive",
    description:
      "Extend focused study beyond the initial block. Work through the natural urge to stop at 25-30 minutes.",
    purpose:
      "Some material requires deep engagement. This skill stretches your focus capacity.",
    icon: "timer",
  },
  {
    slug: "cognitive-recovery",
    name: "Cognitive Recovery",
    tier: 3,
    dimension: "cognitive",
    description:
      "Take effective breaks that actually restore focus. Learn the difference between rest and distraction.",
    purpose:
      "Sustainable study requires recovery. This skill prevents burnout and maintains session quality.",
    icon: "battery",
  },
  {
    slug: "planning-sequencing",
    name: "Planning & Sequencing",
    tier: 4,
    dimension: "metacognitive",
    description:
      "Organize multiple study tasks across a session or week. Prioritize by difficulty, deadline, and energy.",
    purpose:
      "With solid focus skills, you can now optimize how you allocate your study time across subjects.",
    icon: "layout",
  },
  {
    slug: "deadline-calibration",
    name: "Deadline Calibration",
    tier: 4,
    dimension: "metacognitive",
    description:
      "Accurately estimate how long tasks will take and work backward from deadlines to create realistic schedules.",
    purpose:
      "The final skill: turning your improved study habits into reliable academic performance under real constraints.",
    icon: "calendar",
  },
];

const dependencies: [string, string][] = [
  // [dependent, prerequisite]
  ["focus-containment", "task-clarity"],
  ["focus-containment", "initiation"],
  ["environment-control", "task-clarity"],
  ["environment-control", "initiation"],
  ["focus-endurance", "focus-containment"],
  ["cognitive-recovery", "focus-containment"],
  ["cognitive-recovery", "environment-control"],
  ["planning-sequencing", "focus-endurance"],
  ["planning-sequencing", "cognitive-recovery"],
  ["deadline-calibration", "planning-sequencing"],
];

async function main() {
  console.log("Seeding skills...");

  // Upsert skills
  const skillMap: Record<string, string> = {};
  for (const skill of skills) {
    const created = await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: skill,
      create: skill,
    });
    skillMap[skill.slug] = created.id;
  }

  console.log(`Seeded ${skills.length} skills.`);

  // Create dependencies
  for (const [depSlug, preSlug] of dependencies) {
    const depId = skillMap[depSlug];
    const preId = skillMap[preSlug];
    await prisma.skillDependency.upsert({
      where: {
        dependentSkillId_prerequisiteId: {
          dependentSkillId: depId,
          prerequisiteId: preId,
        },
      },
      update: {},
      create: {
        dependentSkillId: depId,
        prerequisiteId: preId,
      },
    });
  }

  console.log(`Seeded ${dependencies.length} dependencies.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
