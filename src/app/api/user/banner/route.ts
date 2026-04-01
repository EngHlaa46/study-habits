import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { bannerImageUrl: true, bannerPosition: true },
  });
  return NextResponse.json({
    bannerImageUrl: profile?.bannerImageUrl ?? null,
    bannerPosition: profile?.bannerPosition ?? "50% 50%",
  });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json();

  const imageUrl = body.imageUrl;
  const position = body.position;

  // Accept null to clear, or a string URL up to 500 chars
  if (imageUrl !== undefined) {
    if (imageUrl !== null && (typeof imageUrl !== "string" || imageUrl.length > 500)) {
      return NextResponse.json({ error: "Invalid imageUrl" }, { status: 400 });
    }
  }

  // Accept a CSS background-position string (e.g. "42% 67%")
  if (position !== undefined) {
    if (typeof position !== "string" || !/^\d{1,3}% \d{1,3}%$/.test(position)) {
      return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    }
  }

  const data: Record<string, string | null> = {};
  if (imageUrl !== undefined) data.bannerImageUrl = imageUrl;
  if (position !== undefined) data.bannerPosition = position;

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
