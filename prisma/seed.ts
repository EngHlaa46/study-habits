import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const skills = [
  // Level 1 — Beginner
  {
    slug: "task-clarity",
    name: "Task Clarity",
    level: 1,
    dimension: "planning",
    description:
      "Define exactly what you will study before you begin. Convert vague intentions into concrete tasks.",
    purpose:
      "Most study sessions fail before they start because the student sits down without knowing what to do. This skill removes that ambiguity — pre-session.",
    icon: "target",
  },
  {
    slug: "initiation",
    name: "Initiation",
    level: 1,
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
    level: 1,
    dimension: "cognitive",
    description:
      "Maintain focused attention for a defined short block (15–25 minutes) without switching tasks.",
    purpose:
      "Once you can start, you need to stay. This skill builds the minimum viable focus window.",
    icon: "eye",
  },

  // Level 2 — Intermediate
  {
    slug: "estimating-time",
    name: "Estimating Time",
    level: 2,
    dimension: "planning",
    description:
      "Accurately estimate how long tasks will take before you start a session. Build a realistic pre-session plan.",
    purpose:
      "Underestimating task time leads to rushed sessions and incomplete work. This skill calibrates your planning instinct.",
    icon: "clock",
  },
  {
    slug: "environment-control",
    name: "Environment Control",
    level: 2,
    dimension: "behavioral",
    description:
      "Set up your study space to eliminate external distractions before you begin. Phone away, tabs closed, materials ready.",
    purpose:
      "Your environment either supports focus or destroys it. This skill makes the choice intentional.",
    icon: "shield",
  },
  {
    slug: "focus-endurance",
    name: "Focus Endurance",
    level: 2,
    dimension: "cognitive",
    description:
      "Extend focused study beyond the initial block. Work through the natural urge to stop at 25–30 minutes.",
    purpose:
      "Some material requires deep engagement. This skill stretches your focus capacity beyond the minimum.",
    icon: "timer",
  },

  // Level 3 — Mastery
  {
    slug: "flexible-planning",
    name: "Flexible Planning",
    level: 3,
    dimension: "planning",
    description:
      "Adapt your study plan dynamically when sessions don't go as expected. Reorganize tasks across sessions without losing progress.",
    purpose:
      "Rigid plans break under real-world pressure. This skill turns setbacks into re-plans rather than stops.",
    icon: "layout",
  },
  {
    slug: "sticking-to-plan",
    name: "Sticking to Plan",
    level: 3,
    dimension: "behavioral",
    description:
      "Follow your pre-session plan through the session without drifting to easier or unrelated tasks.",
    purpose:
      "Planning is only half the battle. This skill closes the gap between intention and execution.",
    icon: "check-square",
  },
  {
    slug: "cognitive-recovery",
    name: "Cognitive Recovery",
    level: 3,
    dimension: "cognitive",
    description:
      "Take effective breaks that actually restore focus. Learn the difference between rest and distraction.",
    purpose:
      "Sustainable study requires recovery. This skill prevents burnout and maintains session quality over time.",
    icon: "battery",
  },
];

async function main() {
  console.log("Seeding skills...");

  // Clear SkillProgress records referencing renamed/removed slugs first
  const oldSkills = await prisma.skill.findMany({
    where: { slug: { in: ["deadline-calibration", "planning-sequencing"] } },
    select: { id: true },
  });
  if (oldSkills.length > 0) {
    await prisma.skillProgress.deleteMany({
      where: { skillId: { in: oldSkills.map((s) => s.id) } },
    });
    await prisma.skill.deleteMany({
      where: { slug: { in: ["deadline-calibration", "planning-sequencing"] } },
    });
  }

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: skill,
      create: skill,
    });
  }

  console.log(`Seeded ${skills.length} skills.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
