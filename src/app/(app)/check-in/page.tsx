import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { CheckInForm } from "@/components/check-in/CheckInForm";
import { redirect } from "next/navigation";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

async function fetchAiQuestions(userId: string, activeSkillId?: string): Promise<string[]> {
  try {
    const [activeSkill, recentCheckIns] = await Promise.all([
      activeSkillId
        ? prisma.skillProgress.findFirst({ where: { userId, status: "active" }, include: { skill: true } })
        : Promise.resolve(null),
      prisma.checkIn.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 5 }),
    ]);

    if (!activeSkill && recentCheckIns.length < 2) return [];

    const weekLabels: Record<number, string> = { 1: "Stabilize", 2: "Express", 3: "Probe" };
    const skillContext = activeSkill
      ? `Active skill: ${activeSkill.skill.name} — Week ${activeSkill.weekPhase} (${weekLabels[activeSkill.weekPhase] ?? ""})`
      : "Observation phase";

    const recentSummary = recentCheckIns
      .map((ci) => `${ci.date.toISOString().split("T")[0]}: studied=${ci.initiated}, focus=${ci.focusLevel ?? "n/a"}`)
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `You are a study coach. Write exactly 2 short reflection questions for a student's daily check-in. Be specific to their skill or patterns — not generic. Each under 15 words. Output only the 2 questions, one per line, no numbering.\n\n${skillContext}\n\nRecent check-ins:\n${recentSummary}`,
      }],
      max_tokens: 100,
      stream: false,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    return raw.split("\n").map((q) => q.trim()).filter((q) => q.length > 0).slice(0, 2);
  } catch {
    return [];
  }
}

export default async function CheckInPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  // Check if already checked in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [existing, activeSkill] = await Promise.all([
    prisma.checkIn.findFirst({ where: { userId, date: { gte: today, lt: tomorrow } } }),
    prisma.skillProgress.findFirst({ where: { userId, status: "active" }, include: { skill: true } }),
  ]);

  if (existing) {
    redirect("/dashboard");
  }

  const aiQuestions = await fetchAiQuestions(userId, activeSkill?.id);

  return (
    <div className="max-w-2xl mx-auto">
      <CheckInForm
        activeSkillSlug={activeSkill?.skill.slug}
        aiQuestions={aiQuestions}
      />
    </div>
  );
}
