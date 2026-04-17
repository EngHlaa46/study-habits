import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAvailableSkills } from "@/lib/skills/progression";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skills = await getAvailableSkills(session.user.id);
  return NextResponse.json({ skills });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skillId, action, userTask } = await req.json();

  if (action === "setTask") {
    if (!skillId || !userTask) {
      return NextResponse.json(
        { error: "skillId and userTask required" },
        { status: 400 }
      );
    }
    if (userTask.length > 500) {
      return NextResponse.json({ error: "Task description too long" }, { status: 400 });
    }
    const { prisma } = await import("@/lib/db/prisma");
    const updated = await prisma.skillProgress.updateMany({
      where: { userId: session.user.id, skillId, status: "active" },
      data: { userTask },
    });
    return NextResponse.json({ updated: updated.count });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
