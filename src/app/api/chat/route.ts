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

  const { message, chatMode } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (message.trim().length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
  }

  const userId = session.user.id;

  // Save user message
  await prisma.chatMessage.create({
    data: { userId, role: "user", content: message },
  });

  // Get recent conversation history (exclude the message we just saved)
  const historyRows = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  // Last row is the user message we just saved — include all as history for the pipeline
  const history = historyRows.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  try {
    const mode = ["training", "study", "skills"].includes(chatMode) ? chatMode : "skills";
    const stream = await runDCSPipeline(userId, message, history, mode);

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
