import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { runDCSPipeline } from "@/lib/ai/dcs/pipeline";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (message.trim().length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
  }

  const userId = session.user.id;

  // Fetch history BEFORE saving so the current message isn't duplicated
  const historyRows = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const history = historyRows.reverse().map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // Save user message after fetching history
  await prisma.chatMessage.create({
    data: { userId, role: "user", content: message },
  });

  try {
    const stream = await runDCSPipeline(userId, message, history);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
