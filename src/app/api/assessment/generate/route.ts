import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Groq from "groq-sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { runGenerationAgent } from "@/lib/ai/dcs/generationAgent";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nodeId } = (await req.json()) as { nodeId: string };
  if (!nodeId) return NextResponse.json({ error: "nodeId required" }, { status: 400 });

  const node = await prisma.skillNode.findUnique({
    where: { id: nodeId },
    include: { skillTree: { include: { sources: true } } },
  });
  if (!node) return NextResponse.json({ error: "Node not found" }, { status: 404 });

  // Serve queued activity if available
  const queued = await prisma.queuedActivity.findFirst({
    where: { userId: session.user.id, nodeId, servedAt: null },
    orderBy: { createdAt: "asc" },
  });

  if (queued) {
    await prisma.queuedActivity.update({ where: { id: queued.id }, data: { servedAt: new Date() } });
    return NextResponse.json({ activity: JSON.parse(queued.activity), source: "queued" });
  }

  // Combine material content from all sources for this skill tree
  const materialContent =
    node.skillTree.sources.length > 0
      ? node.skillTree.sources
          .map((s) => `=== ${s.fileName} ===\n${s.markdownContent}`)
          .join("\n\n")
      : undefined;

  const activity = await runGenerationAgent(
    groq,
    {
      name: node.name,
      description: node.description,
      whatMasteryLooksLike: node.whatMasteryLooksLike,
      suggestedEvalFormat: node.suggestedEvalFormat,
    },
    materialContent
  );

  return NextResponse.json({ activity, source: "generated" });
}
