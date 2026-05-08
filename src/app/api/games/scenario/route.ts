import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { generateScenario } from "@/lib/ai/games/generateScenario";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { skillTreeId, nodeId } = (await req.json()) as { skillTreeId?: string; nodeId?: string };

  try {
    // Resolve target node — prefer explicit nodeId, else pick weakest unlocked node in tree
    let node: { id: string; name: string; description: string; whatMasteryLooksLike: string } | null = null;

    if (nodeId) {
      node = await prisma.skillNode.findFirst({
        where: { id: nodeId, skillTree: { userId } },
        select: { id: true, name: true, description: true, whatMasteryLooksLike: true },
      });
    }

    if (!node) {
      const where = skillTreeId
        ? { skillTreeId, skillTree: { userId }, masteryStatus: { not: "locked" } }
        : { skillTree: { userId }, masteryStatus: { not: "locked" } };

      node = await prisma.skillNode.findFirst({
        where,
        orderBy: { masteryScore: "asc" },
        select: { id: true, name: true, description: true, whatMasteryLooksLike: true },
      });
    }

    if (!node) {
      return NextResponse.json(
        { error: "No study materials found. Upload materials first to play." },
        { status: 422 }
      );
    }

    const scenario = await generateScenario(node);
    return NextResponse.json({ scenario, nodeId: node.id });
  } catch (err) {
    console.error("Scenario generate error:", err);
    return NextResponse.json({ error: "Failed to generate scenario" }, { status: 500 });
  }
}
