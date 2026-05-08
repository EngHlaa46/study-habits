import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Groq from "groq-sdk";
import { runSkillTreeAgent, validateMaterial } from "@/lib/ai/dcs/skillTreeAgent";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text = "";
  let materialName = "Unnamed Material";

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    // Direct text input (e.g. from onboarding subject selection)
    const body = (await req.json()) as { text?: string; name?: string };
    text = body.text ?? "";
    materialName = body.name || "My Subject";
  } else {
    // File upload
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    materialName = (formData.get("name") as string) || file?.name || "Unnamed Material";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdfParse(buffer);
        text = data.text;
      } catch {
        return NextResponse.json({ error: "Failed to parse PDF" }, { status: 400 });
      }
    } else {
      text = await file.text();
    }
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
  }

  // Validate the material before running the full SkillTreeAgent
  try {
    const validation = await validateMaterial(groq, materialName, text.slice(0, 500));
    if (!validation.valid) {
      return NextResponse.json(
        { error: `"${materialName}" doesn't look like a learnable subject. ${validation.reason}` },
        { status: 400 }
      );
    }
  } catch {
    // Validation failure is non-fatal — let the main agent proceed
  }

  let nodes;
  try {
    nodes = await runSkillTreeAgent(groq, text, materialName);
  } catch (err) {
    console.error('[materials] SkillTreeAgent failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // Find root nodes (no prerequisites) to activate first
  const rootLocalIds = new Set(
    nodes.filter((n) => n.prerequisites.length === 0).map((n) => n.id)
  );

  let skillTree;
  try {
    skillTree = await prisma.skillTree.create({
      data: {
        userId: session.user.id,
        materialName,
        nodes: {
          create: nodes.map((node) => ({
            localId: node.id,
            name: node.name,
            description: node.description,
            whatMasteryLooksLike: node.whatMasteryLooksLike,
            prerequisites: JSON.stringify(node.prerequisites),
            suggestedEvalFormat: node.suggestedEvalFormat,
            masteryStatus: rootLocalIds.has(node.id) ? "active" : "locked",
          })),
        },
      },
      include: { nodes: true },
    });
  } catch (err) {
    console.error('[materials] Prisma create failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ skillTree });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skillTrees = await prisma.skillTree.findMany({
    where: { userId: session.user.id },
    include: { nodes: { orderBy: { createdAt: "asc" } } },
    orderBy: { generatedAt: "desc" },
  });

  return NextResponse.json({ skillTrees });
}
