import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const ALLOWED_COLORS = ["#38bdf8", "#a855f7", "#f97316", "#fbbf24", "#4ade80", "#fb7185"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { themePrefs: true },
  });

  const prefs = profile?.themePrefs ? JSON.parse(profile.themePrefs) : { accentColor: "#38bdf8" };
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.accentColor || !ALLOWED_COLORS.includes(body.accentColor)) {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: { themePrefs: JSON.stringify({ accentColor: body.accentColor }) },
  });

  return NextResponse.json({ ok: true });
}
