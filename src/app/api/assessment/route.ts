import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { buildUserContext } from "@/lib/ai/buildContext";
import { generateCached } from "@/lib/ai/generateCached";

const MAX_AGE_MS = 23 * 60 * 60 * 1000; // 23 hours

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  const sessionCount = await prisma.gameSession.count({ where: { userId } });
  if (sessionCount < 1) {
    return NextResponse.json({ text: null });
  }

  const context = await buildUserContext(userId);

  const prompt = `You are an assessment coach reviewing a student's recent practice session data.

Write exactly 2 short sentences:
1. Call out one concrete win — reference a specific node name, score, or mastery trend from the data
2. Name the single best area to push next — frame it as momentum to build on, not a gap to fix

Rules:
- Be direct and energetic, like a coach who genuinely believes in them
- Use actual numbers or node names from the data — no generic praise
- No preamble, no sign-off, output only the 2 sentences

Student context:
${context}`;

  const text = await generateCached(
    userId,
    profile?.assessmentText,
    profile?.assessmentAt,
    prompt,
    MAX_AGE_MS,
    "assessmentText",
    "assessmentAt",
    100
  );

  return NextResponse.json({ text });
}
