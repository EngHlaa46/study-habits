import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

async function getOwnedSource(id: string, userId: string) {
  return prisma.materialSource.findFirst({
    where: { id, skillTree: { userId } },
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const source = await getOwnedSource(params.id, session.user.id);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ markdownContent: source.markdownContent });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const source = await getOwnedSource(params.id, session.user.id);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { markdownContent } = (await req.json()) as { markdownContent?: string };
  if (typeof markdownContent !== "string") {
    return NextResponse.json({ error: "markdownContent required" }, { status: 400 });
  }

  await prisma.materialSource.update({
    where: { id: params.id },
    data: { markdownContent },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const source = await getOwnedSource(params.id, session.user.id);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.materialSource.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
