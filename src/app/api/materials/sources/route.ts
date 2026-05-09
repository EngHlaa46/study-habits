import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { convertFileToMarkdown } from "@/lib/converters/toMarkdown";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const skillTreeId = formData.get("skillTreeId") as string | null;
  const file = formData.get("file") as File | null;

  if (!skillTreeId || !file) {
    return NextResponse.json({ error: "skillTreeId and file are required" }, { status: 400 });
  }

  // Verify tree belongs to user
  const tree = await prisma.skillTree.findFirst({
    where: { id: skillTreeId, userId: session.user.id },
  });
  if (!tree) {
    return NextResponse.json({ error: "Skill tree not found" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const converted = await convertFileToMarkdown(file.name, file.type, buffer);

  const source = await prisma.materialSource.create({
    data: {
      skillTreeId,
      fileName: converted.fileName,
      markdownContent: converted.markdownContent,
    },
    select: { id: true, fileName: true, createdAt: true },
  });

  return NextResponse.json({ source });
}
