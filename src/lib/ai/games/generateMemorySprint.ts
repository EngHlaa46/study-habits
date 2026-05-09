import Groq from "groq-sdk";
import type { MemoryCard } from "@/types/games";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function generateMemoryCard(
  node: { id: string; name: string; description: string; whatMasteryLooksLike: string }
): Promise<MemoryCard> {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You create flashcard-style memory cards for study skill concepts. The card should be readable in 12 seconds.

Return ONLY valid JSON:
{
  "summary": "2-3 sentence distillation of the concept — what it is, why it matters, and one key signal of mastery. Plain language, no jargon."
}`,
      },
      {
        role: "user",
        content: `Concept: ${node.name}\nDescription: ${node.description}\nMastery looks like: ${node.whatMasteryLooksLike}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No memory card content returned");

  const { summary } = JSON.parse(content) as { summary: string };

  return {
    nodeId: node.id,
    name: node.name,
    summary,
    displaySeconds: 12,
  };
}
