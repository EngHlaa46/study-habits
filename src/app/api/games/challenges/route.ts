import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenges = await prisma.gameChallenge.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    orderBy: [{ dueBy: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    challenges.map((c) => ({
      id: c.id,
      gameType: c.gameType,
      title: c.title,
      description: c.description,
      nodeIds: (() => { try { return JSON.parse(c.nodeIds) as string[]; } catch { return []; } })(),
      difficulty: c.difficulty,
      dueBy: c.dueBy?.toISOString() ?? null,
      status: c.status,
      score: c.score,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}
