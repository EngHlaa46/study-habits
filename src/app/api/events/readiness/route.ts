import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { eventId } = await req.json() as { eventId: string };
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!event.examContent?.trim()) return NextResponse.json({ error: "No exam topics added yet" }, { status: 400 });

  const daysUntil = Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const nodes = await prisma.skillNode.findMany({
    where: { skillTree: { userId }, masteryStatus: { not: "locked" } },
    select: { name: true, masteryScore: true, masteryStatus: true },
    orderBy: { masteryScore: "desc" },
    take: 20,
  });

  const nodesList = nodes.length > 0
    ? nodes.map((n) => `- ${n.name}: ${Math.round(n.masteryScore * 100)}% (${n.masteryStatus})`).join("\n")
    : "No practice sessions recorded yet.";

  const prompt = `You are an exam readiness evaluator.

Exam: ${event.name}
${daysUntil > 0 ? `Days until exam: ${daysUntil}` : "Exam date has passed"}
Topics to be covered:
${event.examContent}

Student's current mastery from practice sessions:
${nodesList}

Evaluate how ready this student is. Match their mastered skills against the exam topics.

Respond ONLY with valid JSON — no markdown, no code fences:
{
  "score": 0.72,
  "summary": "Two punchy sentences: name one thing they're strong on, then the one topic to drill before the exam. Be direct and energetic — like a coach.",
  "topics": [
    { "topic": "topic name", "readiness": 0.8, "note": "one short note" }
  ]
}

score is 0.0–1.0. Cover up to 5 of the main exam topics.`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 400,
    stream: false,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";

  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { result = JSON.parse(match[0]); } catch { /* fall through */ }
    }
  }

  if (!result) return NextResponse.json({ error: "Could not evaluate readiness" }, { status: 500 });

  return NextResponse.json(result);
}
