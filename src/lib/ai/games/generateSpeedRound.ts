import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export type SpeedQuestionType = "true_false" | "match";

export interface TrueFalseQuestion {
  type: "true_false";
  statement: string;
  isTrue: boolean;
  explanation: string;
}

export interface MatchQuestion {
  type: "match";
  prompt: string;           // "Which of these is an example of X?"
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export type SpeedQuestion = TrueFalseQuestion | MatchQuestion;

interface SpeedNode {
  id: string;
  name: string;
  description: string;
  whatMasteryLooksLike: string;
  masteryScore: number;
}

// Palm stage → difficulty label
function stageToDifficulty(stage: number): string {
  if (stage <= 2) return "EASY — basic recall and recognition only";
  if (stage <= 4) return "MEDIUM — comprehension and application";
  return "HARD — analysis, edge cases, and transfer";
}

export async function generateSpeedRound(
  nodes: SpeedNode[],
  palmStage: number,
  count = 10,
  preferType: "true_false" | "match" | "mixed" = "mixed"
): Promise<SpeedQuestion[]> {
  if (nodes.length === 0) return [];

  const difficulty = stageToDifficulty(palmStage);
  const typeInstruction =
    preferType === "true_false"
      ? 'Generate ONLY true/false questions (type: "true_false")'
      : preferType === "match"
      ? 'Generate ONLY match/multiple-choice questions (type: "match")'
      : 'Mix true/false and match questions — roughly half each';

  const nodeList = nodes
    .map((n) => `- ${n.name}: ${n.description}`)
    .join("\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You generate rapid-fire speed round questions for a study skill game.
Questions must be SHORT and instantly answerable (under 5 seconds each).

Difficulty: ${difficulty}
${typeInstruction}

Return ONLY valid JSON:
{
  "questions": [
    // true/false format:
    {
      "type": "true_false",
      "statement": "short statement (under 20 words)",
      "isTrue": true,
      "explanation": "one sentence why"
    },
    // match format:
    {
      "type": "match",
      "prompt": "short question (under 15 words)",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "one sentence why"
    }
  ]
}

Rules:
- Exactly ${count} questions
- Statements/prompts must be concise — speed round means quick reading
- Mix topics across the provided nodes
- For ${difficulty.split("—")[0].trim()}: ${difficulty.split("—")[1]?.trim() ?? ""}
- All options in match questions must be plausible`,
      },
      {
        role: "user",
        content: `Generate ${count} speed round questions from these study concepts:\n${nodeList}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No speed round content returned");

  const parsed = JSON.parse(content) as { questions?: SpeedQuestion[] };
  return (parsed.questions ?? []).slice(0, count);
}
