import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  await prisma.feedback.create({
    data: { userId: session.user.id, message },
  });

  return NextResponse.json({ ok: true });
}
