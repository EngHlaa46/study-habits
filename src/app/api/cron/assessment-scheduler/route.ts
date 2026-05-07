import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import Groq from "groq-sdk";
import { runGenerationAgent } from "@/lib/ai/dcs/generationAgent";
import * as webpush from "web-push";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@studyhabits.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function pushToUser(userId: string, title: string, body: string) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url: "/materials" })
      );
    } catch {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    }
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const isWeeklySunday = now.getDay() === 0;

  // Find all nodes due for review or stuck
  const dueNodes = await prisma.skillNode.findMany({
    where: {
      masteryStatus: { in: ["active", "developing", "mastered"] },
      OR: [
        { nextReviewAt: { lte: now } },
        { masteryScore: { lt: 0.5 }, lastPracticedAt: { lt: twoDaysAgo } },
        { masteryScore: { lt: 0.5 }, lastPracticedAt: null },
      ],
    },
    include: { skillTree: { select: { userId: true } } },
  });

  const queuedByUser: Record<string, number> = {};

  for (const node of dueNodes) {
    const userId = node.skillTree.userId;

    // Skip if already queued
    const existing = await prisma.queuedActivity.findFirst({
      where: { userId, nodeId: node.id, servedAt: null },
    });
    if (existing) continue;

    try {
      const activity = await runGenerationAgent(groq, {
        name: node.name,
        description: node.description,
        whatMasteryLooksLike: node.whatMasteryLooksLike,
        suggestedEvalFormat: node.suggestedEvalFormat,
      });

      await prisma.queuedActivity.create({
        data: {
          userId,
          nodeId: node.id,
          activity: JSON.stringify(activity),
        },
      });

      queuedByUser[userId] = (queuedByUser[userId] ?? 0) + 1;
    } catch {
      // Generation failed — skip this node
    }
  }

  // Send one notification per user with queued activities
  for (const [userId, count] of Object.entries(queuedByUser)) {
    const node = dueNodes.find((n) => n.skillTree.userId === userId);
    const body = count === 1
      ? `Practice session for "${node?.name}" is ready — ~${5} min`
      : `${count} practice sessions are ready for you`;

    await pushToUser(userId, "Time to practice", body);

    await prisma.notification.create({
      data: {
        userId,
        content: body,
        type: "daily",
      },
    });
  }

  // Weekly insight — every Sunday
  if (isWeeklySunday) {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.assessmentSession.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: weekAgo } },
    });

    for (const { userId } of activeUsers) {
      const sessions = await prisma.assessmentSession.findMany({
        where: { userId, createdAt: { gte: weekAgo } },
        include: { },
        orderBy: { createdAt: "desc" },
      });

      const nodeIds = Array.from(new Set(sessions.map((s) => s.nodeId)));
      const masteredThisWeek = await prisma.skillNode.count({
        where: { id: { in: nodeIds }, masteryStatus: { in: ["mastered", "maintenance"] } },
      });

      const weakest = sessions
        .sort((a, b) => a.masteryDelta - b.masteryDelta)[0];
      const weakestNode = weakest
        ? await prisma.skillNode.findUnique({ where: { id: weakest.nodeId }, select: { name: true } })
        : null;

      await prisma.weeklyInsight.create({
        data: {
          userId,
          weekOf: weekAgo,
          nodesMastered: masteredThisWeek,
          weakestConcept: weakestNode?.name ?? "",
          summary: `Practiced ${sessions.length} sessions this week. Mastered ${masteredThisWeek} skill node${masteredThisWeek !== 1 ? "s" : ""}.${weakestNode ? ` Weakest area: ${weakestNode.name}.` : ""}`,
        },
      });
    }
  }

  return NextResponse.json({ queued: Object.values(queuedByUser).reduce((a, b) => a + b, 0) });
}
