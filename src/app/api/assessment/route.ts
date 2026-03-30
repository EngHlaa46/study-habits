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

  // Need at least some check-ins to make a useful assessment
  const checkInCount = await prisma.checkIn.count({ where: { userId } });
  if (checkInCount < 3) {
    return NextResponse.json({ text: null });
  }

  const context = await buildUserContext(userId);

  const prompt = `You are a study coach reviewing a student's recent performance. Write 2-3 concise sentences summarizing their study patterns based on the data below. Be honest but constructive — name what's working and what isn't. Output only the summary, no preamble.

Student context:
${context}`;

  const text = await generateCached(
    userId,
    profile?.assessmentText,
    profile?.assessmentAt,
    prompt,
    MAX_AGE_MS,
    "assessmentText",
    "assessmentAt"
  );

  return NextResponse.json({ text });
}
