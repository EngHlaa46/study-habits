import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { bannerImageUrl: true },
  });
  return NextResponse.json({ bannerImageUrl: profile?.bannerImageUrl ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json();

  const imageUrl = body.imageUrl;

  // Accept null to clear, or a string URL up to 500 chars
  if (imageUrl !== null && (typeof imageUrl !== "string" || imageUrl.length > 500)) {
    return NextResponse.json({ error: "Invalid imageUrl" }, { status: 400 });
  }

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: { bannerImageUrl: imageUrl },
  });

  return NextResponse.json({ ok: true });
}
