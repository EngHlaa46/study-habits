import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { applyGameMasteryDelta } from "@/lib/games/masteryUpdate";
import { applyPlanningStabilityNudge } from "@/lib/games/stabilityUpdate";
import { evaluateRecall } from "@/lib/ai/games/evaluateRecall";
import { evaluateTaskBreakdown } from "@/lib/ai/games/evaluateTaskBreakdown";
import type { QuizQuestion, MemoryCard, GameStep, GameSubmitResult } from "@/types/games";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const startedAt = Date.now();

  const body = (await req.json()) as {
    gameType: string;
    challengeId?: string;
    questions?: QuizQuestion[];
    answers?: number[];
    card?: MemoryCard;
    recallText?: string;
    goal?: string;
    steps?: GameStep[];
  };

  const { gameType, challengeId } = body;

  let score = 0;
  let activeScore: number | undefined;
  let retentionScore: number | undefined;
  let feedback = "";
  let perNodeDeltas: GameSubmitResult["perNodeDeltas"] = [];
  let breakdown: GameSubmitResult["breakdown"] | undefined;
  let nodeIds: string[] = [];
  let questionsTotal: number | undefined;
  let questionsCorrect: number | undefined;
  let detailsJson: Record<string, unknown> = {};

  try {
    if (gameType === "QUIZ" && body.questions && body.answers) {
      const { questions, answers } = body;
      nodeIds = questions.map((q) => q.nodeId);
      questionsTotal = questions.length;

      // Build per-node score map, tracking retention vs active separately
      const nodeScoreMap: Record<string, { total: number; correct: number; isRetentionCheck: boolean }> = {};
      let totalCorrect = 0;
      let activeCorrect = 0; let activeTotal = 0;
      let retentionCorrect = 0; let retentionTotal = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const isCorrect = answers[i] === q.correctIndex;
        if (isCorrect) totalCorrect++;

        if (!nodeScoreMap[q.nodeId]) {
          nodeScoreMap[q.nodeId] = { total: 0, correct: 0, isRetentionCheck: q.isRetentionCheck };
        }
        nodeScoreMap[q.nodeId].total++;
        if (isCorrect) nodeScoreMap[q.nodeId].correct++;

        if (q.isRetentionCheck) {
          retentionTotal++;
          if (isCorrect) retentionCorrect++;
        } else {
          activeTotal++;
          if (isCorrect) activeCorrect++;
        }
      }

      questionsCorrect = totalCorrect;
      score = totalCorrect / questions.length;
      activeScore = activeTotal > 0 ? activeCorrect / activeTotal : undefined;
      retentionScore = retentionTotal > 0 ? retentionCorrect / retentionTotal : undefined;

      feedback = buildQuizFeedback(activeScore, retentionScore, score);

      // Apply mastery deltas per node
      // For retention nodes: delta weight is higher on failure (signals forgetting)
      // applyGameMasteryDelta already handles negative deltas naturally via (gameScore - masteryScore) * 0.25
      for (const [nid, { total, correct: c, isRetentionCheck }] of Object.entries(nodeScoreMap)) {
        const nodeScore = c / total;
        const delta = await applyGameMasteryDelta(nid, nodeScore, userId, isRetentionCheck);
        perNodeDeltas.push({ ...delta, isRetentionCheck });
      }

      detailsJson = {
        answers,
        correctAnswers: questions.map((q) => q.correctIndex),
        activeScore,
        retentionScore,
      };
    }

    if (gameType === "MEMORY_SPRINT" && body.card) {
      const { card, recallText = "" } = body;
      nodeIds = [card.nodeId];

      const evaluation = await evaluateRecall(card, recallText);
      score = evaluation.score;
      feedback = evaluation.feedback;

      const delta = await applyGameMasteryDelta(card.nodeId, score, userId, false);
      perNodeDeltas = [{ ...delta, isRetentionCheck: false }];
      detailsJson = { recallText };
    }

    if (gameType === "TASK_BREAKDOWN" && body.goal && body.steps) {
      const { goal, steps } = body;
      nodeIds = [];

      const evaluation = await evaluateTaskBreakdown(goal, steps);
      score = evaluation.composite / 100;
      feedback = evaluation.feedback;
      breakdown = evaluation;

      await applyPlanningStabilityNudge(userId, evaluation.composite);
      detailsJson = { steps, scores: evaluation };
    }

    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

    const gameSession = await prisma.gameSession.create({
      data: {
        userId,
        challengeId: challengeId ?? null,
        gameType,
        nodeIds: JSON.stringify(nodeIds),
        score,
        durationSeconds,
        questionsTotal,
        questionsCorrect,
        detailsJson: JSON.stringify(detailsJson),
      },
    });

    if (challengeId) {
      await prisma.gameChallenge.update({
        where: { id: challengeId },
        data: { status: "COMPLETED", score, completedAt: new Date() },
      });
    }

    const result: GameSubmitResult = {
      sessionId: gameSession.id,
      score,
      activeScore,
      retentionScore,
      feedback,
      perNodeDeltas,
      breakdown,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Game submit error:", err);
    return NextResponse.json({ error: "Failed to submit game results" }, { status: 500 });
  }
}

function buildQuizFeedback(
  activeScore: number | undefined,
  retentionScore: number | undefined,
  overallScore: number
): string {
  // Both present
  if (activeScore !== undefined && retentionScore !== undefined) {
    if (retentionScore < 0.5) {
      return retentionScore < 0.3
        ? "Some mastered concepts are slipping — revisit them before moving forward."
        : "Your past skills need a tune-up. Keep reviewing them alongside new material.";
    }
    if (activeScore >= 0.75) {
      return "Strong progress on new material and your mastered skills are holding firm.";
    }
    if (activeScore >= 0.5) {
      return "Solid effort on new concepts. Keep practicing the ones you missed — you're close.";
    }
    return "New concepts still need work. Focus on the weaker areas before pushing to the next level.";
  }

  // Retention only (all nodes mastered — maintenance quiz)
  if (retentionScore !== undefined) {
    if (retentionScore >= 0.85) return "Excellent retention — your mastered skills are staying strong.";
    if (retentionScore >= 0.65) return "Good retention overall. A few concepts could use a quick review.";
    return "Some mastered skills are fading. Revisit the ones you got wrong.";
  }

  // Active only (no mastered nodes yet)
  if (overallScore >= 0.8) return "Excellent — you clearly understand this material.";
  if (overallScore >= 0.5) return "Good effort. A few more reps on the missed concepts and you'll be there.";
  return "Keep practicing — review the concepts you missed and try again soon.";
}
