import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      profile: { onboardingComplete: true },
    },
    include: {
      profile: true,
      activePhase: true,
      checkIns: {
        orderBy: { date: "desc" },
        take: 7,
      },
      skillProgresses: {
        where: { status: "active" },
        include: { skill: true },
        take: 1,
      },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let created = 0;

  for (const user of users) {
    // Skip if already notified today
    const existing = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: today },
      },
    });
    if (existing) continue;

    // Build a short context summary for Groq
    const recentDays = user.checkIns.length;
    const studiedDays = user.checkIns.filter((c) => c.initiated).length;
    const activeSkill = user.skillProgresses[0]?.skill?.name ?? null;
    const phase = user.activePhase?.phase ?? "observation";

    const contextLines = [
      `Student: ${user.name ?? "there"}`,
      `Phase: ${phase}`,
      activeSkill ? `Active skill: ${activeSkill}` : null,
      `Recent check-ins: ${studiedDays}/${recentDays} days studied`,
    ]
      .filter(Boolean)
      .join(". ");

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a supportive study coach. Write a single short, warm, personalized daily notification (1-2 sentences, max 120 characters) to motivate the student based on their context. No emojis. No greeting prefix.",
          },
          { role: "user", content: contextLines },
        ],
        max_tokens: 60,
        temperature: 0.8,
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) continue;

      await prisma.notification.create({
        data: { userId: user.id, content },
      });
      created++;
    } catch {
      // Skip this user on error; don't abort the whole batch
    }
  }

  return NextResponse.json({ ok: true, created });
}
