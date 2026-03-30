import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();

  await prisma.notification.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
