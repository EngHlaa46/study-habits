import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Groq from "groq-sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ questions: [] }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [activeSkill, recentCheckIns] = await Promise.all([
      prisma.skillProgress.findFirst({
        where: { userId, status: "active" },
        include: { skill: true },
      }),
      prisma.checkIn.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
      }),
    ]);

    // Need enough context to generate useful questions
    if (!activeSkill && recentCheckIns.length < 2) {
      return NextResponse.json({ questions: [] });
    }

    const weekLabels: Record<number, string> = { 1: "Stabilize", 2: "Express", 3: "Probe" };
    const skillContext = activeSkill
      ? `Active skill: ${activeSkill.skill.name} — Week ${activeSkill.weekPhase} (${weekLabels[activeSkill.weekPhase] ?? ""})`
      : "No active skill yet (observation phase)";

    const recentSummary = recentCheckIns
      .map((ci) => {
        const date = ci.date.toISOString().split("T")[0];
        return `${date}: studied=${ci.initiated}, focus=${ci.focusLevel ?? "n/a"}`;
      })
      .join("\n");

    const prompt = `You are a study coach. Based on this student's context, write exactly 2 short reflection questions for their daily check-in. Each question should be specific to their current skill or recent patterns — not generic. Keep each question under 15 words. Output only the 2 questions, one per line, no numbering, no preamble.

${skillContext}

Recent check-ins:
${recentSummary}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      stream: false,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const questions = raw
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 2);

    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ questions: [] });
  }
}
