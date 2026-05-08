import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Groq from "groq-sdk";
import {
  runSkillTreeAgent,
  validateMaterial,
  generateStudyGoals,
  extractCombinedOutline,
} from "@/lib/ai/dcs/skillTreeAgent";
import { convertFileToMarkdown } from "@/lib/converters/toMarkdown";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let materialName = "My Subject";
  let outlineText = ""; // what goes to SkillTreeAgent
  const convertedSources: { fileName: string; markdownContent: string }[] = [];

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    // Text/outline input from onboarding
    const body = (await req.json()) as { text?: string; name?: string };
    outlineText = body.text ?? "";
    materialName = body.name || "My Subject";
  } else {
    // File upload(s) — convert each to Markdown, then extract combined outline
    const formData = await req.formData();
    materialName = (formData.get("name") as string) || "My Subject";

    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;
    const allFiles = files.length > 0 ? files : singleFile ? [singleFile] : [];

    if (allFiles.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Convert all files to Markdown in parallel
    const results = await Promise.allSettled(
      allFiles.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return convertFileToMarkdown(file.name, file.type, buffer);
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") convertedSources.push(r.value);
    }

    if (convertedSources.length === 0) {
      return NextResponse.json({ error: "Failed to convert any files" }, { status: 400 });
    }

    // Extract combined outline from all converted MDs
    outlineText = await extractCombinedOutline(groq, materialName, convertedSources);

    // Fallback: concatenate headings from MDs if LLM fails
    if (!outlineText) {
      outlineText = convertedSources
        .flatMap((s) =>
          s.markdownContent
            .split("\n")
            .filter((l) => l.startsWith("#") || l.startsWith("- "))
            .slice(0, 20)
        )
        .join("\n");
    }
  }

  if (!outlineText.trim()) {
    return NextResponse.json({ error: "Could not extract text from input" }, { status: 400 });
  }

  // Validate subject before running the full agent
  try {
    const validation = await validateMaterial(groq, materialName, outlineText.slice(0, 500));
    if (!validation.valid) {
      return NextResponse.json(
        { error: `"${materialName}" doesn't look like a learnable subject. ${validation.reason}` },
        { status: 400 }
      );
    }
  } catch {
    // Non-fatal — proceed if validator crashes
  }

  let nodes;
  let studyGoals: string[] = [];
  try {
    [nodes, studyGoals] = await Promise.all([
      runSkillTreeAgent(groq, outlineText, materialName),
      generateStudyGoals(groq, materialName, outlineText.slice(0, 300)).catch(() => []),
    ]);
  } catch (err) {
    console.error("[materials] SkillTreeAgent failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

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
        // Store converted MD sources for the GenerationAgent
        ...(convertedSources.length > 0 && {
          sources: {
            create: convertedSources.map((s) => ({
              fileName: s.fileName,
              markdownContent: s.markdownContent,
            })),
          },
        }),
      },
      include: { nodes: true, sources: true },
    });
  } catch (err) {
    console.error("[materials] Prisma create failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ skillTree, studyGoals });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skillTrees = await prisma.skillTree.findMany({
    where: { userId: session.user.id },
    include: {
      nodes: { orderBy: { createdAt: "asc" } },
      sources: { select: { id: true, fileName: true, createdAt: true } },
    },
    orderBy: { generatedAt: "desc" },
  });

  return NextResponse.json({ skillTrees });
}
