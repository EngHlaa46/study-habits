import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const VALID_COACHING_STYLES = ["direct", "socratic"];
const VALID_MOTIVATIONAL_FRAMES = ["intrinsic", "exam"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  }) as { coachingStyle?: string | null; motivationalFrame?: string | null; phoneUsageHours?: number | null; calendarFeedUrl?: string | null; calendarLastSynced?: Date | null } | null;

  return NextResponse.json({
    coachingStyle: profile?.coachingStyle ?? "direct",
    motivationalFrame: profile?.motivationalFrame ?? "intrinsic",
    phoneUsageHours: profile?.phoneUsageHours ?? null,
    calendarFeedUrl: profile?.calendarFeedUrl ?? null,
    calendarLastSynced: profile?.calendarLastSynced ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.coachingStyle !== undefined) {
    if (!VALID_COACHING_STYLES.includes(body.coachingStyle)) {
      return NextResponse.json({ error: "Invalid coachingStyle" }, { status: 400 });
    }
    data.coachingStyle = body.coachingStyle;
  }

  if (body.motivationalFrame !== undefined) {
    if (!VALID_MOTIVATIONAL_FRAMES.includes(body.motivationalFrame)) {
      return NextResponse.json({ error: "Invalid motivationalFrame" }, { status: 400 });
    }
    data.motivationalFrame = body.motivationalFrame;
  }

  if (body.phoneUsageHours !== undefined) {
    const hours = parseFloat(body.phoneUsageHours);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      return NextResponse.json({ error: "Invalid phoneUsageHours" }, { status: 400 });
    }
    data.phoneUsageHours = hours;
  }

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
