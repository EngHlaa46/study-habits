import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.gameSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { challenge: { select: { title: true } } },
  });

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      gameType: s.gameType,
      score: s.score,
      durationSeconds: s.durationSeconds,
      questionsTotal: s.questionsTotal,
      questionsCorrect: s.questionsCorrect,
      challengeTitle: s.challenge?.title ?? null,
      createdAt: s.createdAt.toISOString(),
    }))
  );
}
