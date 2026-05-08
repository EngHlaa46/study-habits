import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { generateQuiz } from "@/lib/ai/games/generateQuiz";
import type { QuizNode } from "@/lib/ai/games/generateQuiz";
import { generateMemoryCard } from "@/lib/ai/games/generateMemorySprint";
import { generateTaskBreakdown } from "@/lib/ai/games/generateTaskBreakdown";

// Below this score = still building mastery (active learning questions)
const MASTERY_THRESHOLD = 0.75;
// Max questions per category
const MAX_ACTIVE = 7;
const MAX_RETENTION = 3;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { gameType, nodeIds, challengeId, difficulty } = (await req.json()) as {
    gameType: string;
    nodeIds?: string[];
    challengeId?: string;
    difficulty?: string;
  };

  // Resolve explicit challenge node IDs if provided
  let targetNodeIds: string[] = nodeIds ?? [];
  if (challengeId && targetNodeIds.length === 0) {
    const challenge = await prisma.gameChallenge.findFirst({
      where: { id: challengeId, userId },
    });
    if (challenge) {
      try { targetNodeIds = JSON.parse(challenge.nodeIds) as string[]; } catch { /* ignore */ }
    }
  }

  try {
    if (gameType === "QUIZ") {
      const quizNodes = await resolveQuizNodes(userId, targetNodeIds, difficulty);
      if (quizNodes.length === 0) {
        return NextResponse.json(
          { error: "No study materials found. Upload a material first to play." },
          { status: 422 }
        );
      }
      const questions = await generateQuiz(quizNodes);
      return NextResponse.json({ gameType: "QUIZ", questions });
    }

    // For non-quiz games, use the simpler node resolution
    const simpleNodes = await resolveSimpleNodes(userId, targetNodeIds);
    if (simpleNodes.length === 0) {
      return NextResponse.json(
        { error: "No study materials found. Upload a material first to play." },
        { status: 422 }
      );
    }

    if (gameType === "MEMORY_SPRINT") {
      // Prefer active/developing nodes for memory sprint
      const node = simpleNodes[Math.floor(Math.random() * simpleNodes.length)];
      const card = await generateMemoryCard(node);
      return NextResponse.json({ gameType: "MEMORY_SPRINT", card });
    }

    if (gameType === "TASK_BREAKDOWN") {
      const upcomingEvents = await prisma.event.findMany({
        where: { userId, status: "upcoming" },
        orderBy: { date: "asc" },
        take: 3,
      });
      const events = upcomingEvents.map((e) => ({
        name: e.name,
        type: e.type,
        daysUntil: Math.ceil((e.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      }));
      const goal = await generateTaskBreakdown(simpleNodes, events);
      return NextResponse.json({ gameType: "TASK_BREAKDOWN", goal });
    }

    return NextResponse.json({ error: "Unknown game type" }, { status: 400 });
  } catch (err) {
    console.error("Game generate error:", err);
    return NextResponse.json({ error: "Failed to generate game content" }, { status: 500 });
  }
}

async function resolveQuizNodes(
  userId: string,
  targetNodeIds: string[],
  difficulty?: string
): Promise<QuizNode[]> {
  // If specific node IDs were given (e.g. from a challenge), fetch those and tag by mastery
  if (targetNodeIds.length > 0) {
    const nodes = await prisma.skillNode.findMany({
      where: { id: { in: targetNodeIds } },
      select: { id: true, name: true, description: true, whatMasteryLooksLike: true, masteryScore: true },
    });
    // Override difficulty uniformly if challenge sets it explicitly
    const overrideDifficulty = difficulty;
    return nodes.map((n) => ({
      ...n,
      masteryScore: overrideDifficulty === "EASY" ? 0.1
        : overrideDifficulty === "HARD" ? 0.85
        : n.masteryScore,
      isRetentionCheck: n.masteryScore >= MASTERY_THRESHOLD,
    }));
  }

  // Smart selection: fetch all user nodes with mastery data
  const allNodes = await prisma.skillNode.findMany({
    where: { skillTree: { userId } },
    select: {
      id: true,
      name: true,
      description: true,
      whatMasteryLooksLike: true,
      masteryScore: true,
      masteryStatus: true,
      lastPracticedAt: true,
    },
  });

  if (allNodes.length === 0) return [];

  // Active nodes: below mastery threshold, sorted weakest-first
  // (build from weakest upward — never skip ahead)
  const activeNodes = allNodes
    .filter((n) => n.masteryScore < MASTERY_THRESHOLD)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, MAX_ACTIVE);

  // Retention nodes: at or above mastery threshold, sorted by least recently practiced
  // (oldest practice = highest risk of forgetting)
  const retentionNodes = allNodes
    .filter((n) => n.masteryScore >= MASTERY_THRESHOLD)
    .sort((a, b) => {
      const aTime = a.lastPracticedAt?.getTime() ?? 0;
      const bTime = b.lastPracticedAt?.getTime() ?? 0;
      return aTime - bTime; // oldest first
    })
    .slice(0, MAX_RETENTION);

  const result: QuizNode[] = [
    ...activeNodes.map((n) => ({ ...n, isRetentionCheck: false })),
    ...retentionNodes.map((n) => ({ ...n, isRetentionCheck: true })),
  ];

  // Edge case: all nodes mastered — quiz is a full retention run
  return result;
}

async function resolveSimpleNodes(
  userId: string,
  targetNodeIds: string[]
): Promise<{ id: string; name: string; description: string; whatMasteryLooksLike: string }[]> {
  if (targetNodeIds.length > 0) {
    return prisma.skillNode.findMany({
      where: { id: { in: targetNodeIds } },
      select: { id: true, name: true, description: true, whatMasteryLooksLike: true },
    });
  }
  const trees = await prisma.skillTree.findMany({
    where: { userId },
    include: {
      nodes: {
        where: { masteryStatus: { in: ["active", "developing", "locked"] } },
        orderBy: { masteryScore: "asc" },
        take: 10,
      },
    },
    orderBy: { generatedAt: "desc" },
    take: 2,
  });
  return trees.flatMap((t) => t.nodes).slice(0, 8);
}
