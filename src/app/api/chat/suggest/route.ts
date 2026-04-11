import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ suggestion: "" });

  const { input, history } = await req.json();
  if (!input || typeof input !== "string" || input.trim().length < 10) {
    return NextResponse.json({ suggestion: "" });
  }

  const recentContext = (history as { role: string; content: string }[])
    ?.slice(-4)
    .map((m) => `${m.role === "user" ? "Student" : "Coach"}: ${m.content.slice(0, 120)}`)
    .join("\n") ?? "";

  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are an autocomplete assistant for a study coaching app. Complete the student's message naturally. Return ONLY the completion words (not the original input), 2-8 words max, no punctuation at the end unless it ends the sentence. If no natural completion exists, return an empty string.",
        },
        {
          role: "user",
          content: `Recent conversation:\n${recentContext}\n\nStudent is typing: "${input.trim()}"\n\nComplete it (return only the added words):`,
        },
      ],
      max_tokens: 30,
      temperature: 0.4,
    });

    const suggestion = res.choices[0]?.message?.content?.trim() ?? "";
    // Reject suggestions that look like full rewrites
    if (suggestion.length > 60 || suggestion.includes('"')) {
      return NextResponse.json({ suggestion: "" });
    }
    return NextResponse.json({ suggestion });
  } catch {
    return NextResponse.json({ suggestion: "" });
  }
}
