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
  const context = await buildUserContext(userId);

  const prompt = `You are a supportive study coach. Based on this student's context, write one short (1-2 sentence) encouraging phrase that feels personal to their current situation. Do NOT use generic platitudes. Be specific and warm. Output only the phrase, no quotes, no preamble.

Student context:
${context}`;

  const text = await generateCached(
    userId,
    profile?.inspirationText,
    profile?.inspirationAt,
    prompt,
    MAX_AGE_MS,
    "inspirationText",
    "inspirationAt"
  );

  return NextResponse.json({
    text,
    affirmation: profile?.personalAffirmation ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (typeof body.affirmation !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: { personalAffirmation: body.affirmation.slice(0, 300) },
  });

  return NextResponse.json({ ok: true });
}
