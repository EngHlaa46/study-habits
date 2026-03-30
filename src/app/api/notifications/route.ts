import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await requireAuth();

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, read: false },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ notifications });
}
