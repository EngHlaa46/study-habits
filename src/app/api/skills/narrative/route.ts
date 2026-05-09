import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const userId = session.user.id;

  const body = await req.json();
  const { skillProgressId } = body;
  if (!skillProgressId || typeof skillProgressId !== "string") {
    return NextResponse.json({ error: "Missing skillProgressId" }, { status: 400 });
  }

  const progress = await prisma.skillProgress.findUnique({
    where: { id: skillProgressId },
    include: { skill: true },
  });

  if (!progress || progress.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (progress.status !== "stable" && progress.status !== "mastered") {
    return NextResponse.json({ error: "Skill not yet completed" }, { status: 400 });
  }

  // Return cached narrative if it exists
  if (progress.completionNarrative) {
    return NextResponse.json({ narrative: progress.completionNarrative });
  }

  // Fetch check-ins during training period
  const trainingStart = progress.weekPhaseStart ?? progress.createdAt;
  const checkIns = await prisma.checkIn.findMany({
    where: { userId, date: { gte: trainingStart } },
    orderBy: { date: "asc" },
  });

  const totalDays = checkIns.length;
  const initiatedDays = checkIns.filter((c) => c.initiated).length;
  const focusedDays = checkIns.filter(
    (c) => c.focusLevel === "focused" || c.focusLevel === "deep"
  ).length;
  const atypicalDays = checkIns.filter((c) => c.atypical).length;
  const stabilityPct = Math.round(progress.stabilityScore * 100);

  const missReasons = checkIns
    .map((c) => (c as { missReason?: string | null }).missReason)
    .filter(Boolean) as string[];
  const dominantMiss =
    missReasons.length > 0
      ? Object.entries(
          missReasons.reduce<Record<string, number>>((acc, r) => {
            acc[r] = (acc[r] ?? 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0]?.[0]
      : null;

  const prompt = [
    `Skill completed: ${progress.skill.name} (${progress.skill.dimension ?? "general"} dimension)`,
    `Stability score: ${stabilityPct}%`,
    `Training period: ${totalDays} check-ins total`,
    `Initiated: ${initiatedDays}/${totalDays} days`,
    `Focused/deep sessions: ${focusedDays}`,
    atypicalDays > 0 ? `Atypical days handled: ${atypicalDays}` : null,
    dominantMiss ? `Main obstacle encountered: ${dominantMiss}` : null,
    progress.userTask ? `User's defined task: ${progress.userTask}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a study coach writing a brief skill completion summary. Write exactly 2-3 sentences: first, describe what changed in the student's behavior based on the data. Second, name the specific challenge they overcame. Third (optional), one sentence on what the next skill builds on. Be specific and grounded in the data — no generic praise. No emojis. Keep it under 80 words.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.7,
    });

    const narrative = completion.choices[0]?.message?.content?.trim();
    if (!narrative) {
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }

    await prisma.skillProgress.update({
      where: { id: skillProgressId },
      data: { completionNarrative: narrative, completionNarrativeAt: new Date() },
    });

    return NextResponse.json({ narrative });
  } catch {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
