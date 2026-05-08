import Groq from "groq-sdk";
import type { GameStep, TaskBreakdownScores } from "@/types/games";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function evaluateTaskBreakdown(
  goal: string,
  steps: GameStep[]
): Promise<TaskBreakdownScores> {
  const stepsText = steps
    .map((s, i) => `${i + 1}. "${s.text}" — ${s.estimatedMinutes} min`)
    .join("\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You evaluate a student's study plan breakdown for a given goal.

Return ONLY valid JSON:
{
  "specificity": 0-100,
  "realism": 0-100,
  "coverage": 0-100,
  "composite": 0-100,
  "feedback": "2-3 sentences: highlight one strength, one specific improvement, and an encouraging close"
}

Scoring criteria:
- specificity (0-100): Are steps concrete actions (e.g. "re-read section 3.2") vs vague ("study more")?
- realism (0-100): Are time estimates plausible for each step? Are there too many/few steps?
- coverage (0-100): Do the steps collectively address the full goal, or are key parts missing?
- composite: weighted average (specificity 35%, realism 35%, coverage 30%)

Keep feedback encouraging and actionable — this is a learning exercise.`,
      },
      {
        role: "user",
        content: `Goal: "${goal}"\n\nStudent's plan:\n${stepsText}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No task breakdown evaluation returned");

  return JSON.parse(content) as TaskBreakdownScores;
}
