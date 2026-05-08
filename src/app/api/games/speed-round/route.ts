import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { generateSpeedRound } from "@/lib/ai/games/generateSpeedRound";
import { computePalmStage } from "@/lib/games/palmStage";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { skillTreeId } = (await req.json()) as { skillTreeId?: string };

  try {
    // Get palm stage for difficulty scaling
    let palmStage = 1;
    if (skillTreeId) {
      const palm = await prisma.skillPalm.findUnique({ where: { skillTreeId } });
      if (palm) palmStage = computePalmStage(palm.palmXP);
    }

    // Fetch active nodes (unlocked, not fully mastered)
    const nodes = await prisma.skillNode.findMany({
      where: skillTreeId
        ? { skillTreeId, skillTree: { userId }, masteryStatus: { not: "locked" } }
        : { skillTree: { userId }, masteryStatus: { not: "locked" } },
      orderBy: { masteryScore: "asc" },
      take: 8,
      select: { id: true, name: true, description: true, whatMasteryLooksLike: true, masteryScore: true },
    });

    if (nodes.length === 0) {
      return NextResponse.json(
        { error: "No study materials found. Upload materials first to play." },
        { status: 422 }
      );
    }

    // Fetch personal best for this tree
    const pbSession = await prisma.gameSession.findFirst({
      where: { userId, gameType: "SPEED_ROUND", skillTreeId: skillTreeId ?? null },
      orderBy: { score: "desc" },
      select: { score: true, questionsCorrect: true },
    });

    const preferType = palmStage >= 4 ? "mixed" : "true_false";
    const questions = await generateSpeedRound(nodes, palmStage, 12, preferType);

    return NextResponse.json({
      questions,
      palmStage,
      personalBest: pbSession ? { score: pbSession.score, correct: pbSession.questionsCorrect ?? 0 } : null,
    });
  } catch (err) {
    console.error("Speed round generate error:", err);
    return NextResponse.json({ error: "Failed to generate speed round" }, { status: 500 });
  }
}
