import Groq from "groq-sdk";
import type { TaskBreakdownGoal } from "@/types/games";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function generateTaskBreakdown(
  nodes: { id: string; name: string; description: string }[],
  events: { name: string; type: string; daysUntil: number }[] = []
): Promise<TaskBreakdownGoal> {
  const nodeContext = nodes
    .slice(0, 5)
    .map((n) => `- ${n.name}: ${n.description}`)
    .join("\n");

  const eventContext =
    events.length > 0
      ? `\nUpcoming events:\n${events.map((e) => `- ${e.name} (${e.type}) in ${e.daysUntil} days`).join("\n")}`
      : "";

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You create vague, real-world study goals for a planning exercise. The goal should be specific enough to be actionable but vague enough that decomposing it into steps requires thought.

Return ONLY valid JSON:
{
  "goal": "A 1-2 sentence vague study goal drawn from the student's actual context",
  "context": "Short phrase like 'Based on your Biology materials' or 'With your exam coming up'",
  "sourceNodeIds": ["id1", "id2"]
}

Examples of good goals:
- "You need to feel ready for your Chemistry exam next week. Where do you start?"
- "You want to catch up on the last two weeks of Biology notes before the weekend."
- "You have 90 minutes tomorrow and want to make real progress on your hardest topic."`,
      },
      {
        role: "user",
        content: `Student's active study concepts:\n${nodeContext}${eventContext}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No task breakdown content returned");

  const parsed = JSON.parse(content) as { goal: string; context: string; sourceNodeIds: string[] };

  return {
    text: parsed.goal,
    context: parsed.context,
    sourceNodeIds: parsed.sourceNodeIds ?? [],
  };
}
