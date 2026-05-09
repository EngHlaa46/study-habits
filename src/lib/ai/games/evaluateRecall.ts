import Groq from "groq-sdk";
import type { MemoryCard } from "@/types/games";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function evaluateRecall(
  card: MemoryCard,
  userRecall: string
): Promise<{ score: number; feedback: string }> {
  if (!userRecall.trim()) {
    return { score: 0, feedback: "Nothing recalled — that's okay. Reading the card again will help." };
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You evaluate how well a student recalled a study concept after a brief flash display.

Return ONLY valid JSON:
{
  "score": 0.0-1.0,
  "feedback": "1-2 encouraging sentences noting what they got right and what key point they missed"
}

Scoring:
- 0.0-0.2: recalled almost nothing relevant
- 0.3-0.5: captured the core idea but missed key details
- 0.6-0.8: solid recall with minor gaps
- 0.9-1.0: accurate, complete recall of key points`,
      },
      {
        role: "user",
        content: `Concept: ${card.name}\n\nOriginal card text:\n"${card.summary}"\n\nStudent recalled:\n"${userRecall}"`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No recall evaluation returned");

  return JSON.parse(content) as { score: number; feedback: string };
}
