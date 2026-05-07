import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Groq from "groq-sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { interpretCheckInResponses } from "@/lib/ai/dcs/checkInAgent";
import type { CheckInQuestion } from "@/lib/ai/dcs/checkInAgent";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { questions, responses, date } = (await req.json()) as {
    questions: CheckInQuestion[];
    responses: string[];
    date?: string;
  };

  if (!questions?.length || !responses?.length) {
    return NextResponse.json({ error: "Missing questions or responses" }, { status: 400 });
  }

  const entryDate = date ? new Date(date) : new Date();
  entryDate.setHours(0, 0, 0, 0);

  // Prevent duplicate entry for same day
  const existing = await prisma.checkInEntry.findUnique({
    where: { userId_date: { userId, date: entryDate } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already checked in for this date" }, { status: 409 });
  }

  const signals = await interpretCheckInResponses(groq, questions, responses);

  await prisma.checkInEntry.create({
    data: {
      userId,
      date: entryDate,
      questions: JSON.stringify(questions),
      responses: JSON.stringify(responses),
      inferredSignals: JSON.stringify(signals),
    },
  });

  return NextResponse.json({ signals });
}
