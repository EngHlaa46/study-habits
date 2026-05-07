import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Groq from "groq-sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { runAnalysisAgent, calculateSpacedRepetition, calculateMasteryStatus } from "@/lib/ai/dcs/analysisAgent";
import type { GeneratedActivity } from "@/lib/ai/dcs/generationAgent";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nodeId, activity, studentResponse, confidenceLevel } = (await req.json()) as {
    nodeId: string;
    activity: GeneratedActivity;
    studentResponse: string;
    confidenceLevel: number;
  };

  if (!nodeId || !activity || !studentResponse) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const node = await prisma.skillNode.findUnique({ where: { id: nodeId } });
  if (!node) return NextResponse.json({ error: "Node not found" }, { status: 404 });

  // Find sibling nodes that could be unlocked next
  const siblingNodes = await prisma.skillNode.findMany({
    where: { skillTreeId: node.skillTreeId, masteryStatus: "locked" },
    select: { localId: true, name: true, prerequisites: true },
  });

  const availableNext = siblingNodes.filter((n) => {
    const prereqs = JSON.parse(n.prerequisites) as string[];
    return prereqs.includes(node.localId);
  }).map((n) => ({ localId: n.localId, name: n.name }));

  const result = await runAnalysisAgent(
    groq,
    { name: node.name, whatMasteryLooksLike: node.whatMasteryLooksLike, localId: node.localId },
    activity,
    studentResponse,
    confidenceLevel,
    availableNext
  );

  // Update mastery score (clamped 0-1)
  const newScore = Math.max(0, Math.min(1, node.masteryScore + result.masteryDelta));
  const sessionCount = await prisma.assessmentSession.count({ where: { nodeId, userId: session.user.id } });
  const newStatus = calculateMasteryStatus(newScore, sessionCount + 1);
  const { interval, nextReviewAt } = calculateSpacedRepetition(newScore, node.reviewInterval);

  await prisma.skillNode.update({
    where: { id: nodeId },
    data: {
      masteryScore: newScore,
      masteryStatus: newStatus,
      lastPracticedAt: new Date(),
      nextReviewAt,
      reviewInterval: interval,
    },
  });

  // Unlock nodes whose prerequisites are now met
  if (newStatus === "mastered" || newStatus === "maintenance") {
    const treeNodes = await prisma.skillNode.findMany({
      where: { skillTreeId: node.skillTreeId, masteryStatus: "locked" },
    });
    const masteredLocalIds = new Set(
      (await prisma.skillNode.findMany({
        where: { skillTreeId: node.skillTreeId, masteryStatus: { in: ["mastered", "maintenance"] } },
        select: { localId: true },
      })).map((n) => n.localId)
    );
    masteredLocalIds.add(node.localId);

    for (const locked of treeNodes) {
      const prereqs = JSON.parse(locked.prerequisites) as string[];
      if (prereqs.length > 0 && prereqs.every((p) => masteredLocalIds.has(p))) {
        await prisma.skillNode.update({ where: { id: locked.id }, data: { masteryStatus: "active" } });
      }
    }
  }

  // Save session
  await prisma.assessmentSession.create({
    data: {
      userId: session.user.id,
      nodeId,
      activity: JSON.stringify(activity),
      studentResponse,
      masteryDelta: result.masteryDelta,
      calibrationScore: result.calibrationAccuracy,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      aiNotes: result.aiNotes,
    },
  });

  return NextResponse.json({
    result,
    newMasteryScore: newScore,
    newMasteryStatus: newStatus,
    nextReviewAt: nextReviewAt.toISOString(),
  });
}
