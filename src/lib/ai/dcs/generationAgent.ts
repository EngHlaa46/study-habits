import Groq from "groq-sdk";

export interface GeneratedActivity {
  format: string;
  title: string;
  instruction: string;
  prompt?: string;
  questions?: string[];
  pairs?: { term: string; match: string }[];
  code?: string;
  estimatedMinutes: number;
}

export async function runGenerationAgent(
  groq: Groq,
  node: {
    name: string;
    description: string;
    whatMasteryLooksLike: string;
    suggestedEvalFormat: string;
  },
  materialContent?: string
): Promise<GeneratedActivity> {
  const formatInstructions: Record<string, string> = {
    recall_quiz: `Generate 4 short recall questions testing specific facts, definitions, or concepts.
Return: { "format": "recall_quiz", "title": "...", "instruction": "Answer each question briefly.", "questions": ["q1", "q2", "q3", "q4"], "estimatedMinutes": 5 }`,
    matching_game: `Generate 6 pairs of terms and their matches (definition, example, or counterpart).
Return: { "format": "matching_game", "title": "...", "instruction": "Match each term to its correct pair.", "pairs": [{"term":"...","match":"..."}, ...], "estimatedMinutes": 4 }`,
    problem_solving: `Generate one clear problem that requires applying the skill to solve it. Include any necessary context.
Return: { "format": "problem_solving", "title": "...", "instruction": "Solve the following problem. Show your reasoning.", "prompt": "...", "estimatedMinutes": 8 }`,
    code_debugging: `Generate a short code snippet (10-20 lines) with 2-3 deliberate bugs. The code should be relevant to the skill.
Return: { "format": "code_debugging", "title": "...", "instruction": "Find and fix the bugs in this code. Explain what each bug was.", "code": "...", "estimatedMinutes": 7 }`,
    explanation_prompt: `Generate one conceptual explanation challenge — ask the student to explain a concept, why something works, or teach it to a beginner.
Return: { "format": "explanation_prompt", "title": "...", "instruction": "Write your explanation clearly as if teaching someone new to this.", "prompt": "...", "estimatedMinutes": 6 }`,
    analogy_task: `Generate one analogy challenge — ask the student to find an analogy between this concept and something from a completely different domain.
Return: { "format": "analogy_task", "title": "...", "instruction": "Create an analogy that captures the essence of this concept.", "prompt": "...", "estimatedMinutes": 5 }`,
    creative_challenge: `Generate one open-ended creative challenge that requires applying the skill in a novel or generative way.
Return: { "format": "creative_challenge", "title": "...", "instruction": "...", "prompt": "...", "estimatedMinutes": 10 }`,
  };

  const formatKey = node.suggestedEvalFormat in formatInstructions
    ? node.suggestedEvalFormat
    : "explanation_prompt";

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are an expert assessment designer. Generate ONE high-quality assessment activity for the skill node described below.

${formatInstructions[formatKey]}

RULES:
- Make the activity genuinely test the mastery level described — not just surface recall
- Be specific and concrete, not generic
- Use content from the student's actual course material when provided — reference real examples, terms, or problems from it
- Output ONLY valid JSON matching the structure above — no other text`,
      },
      {
        role: "user",
        content: `Skill: ${node.name}
Description: ${node.description}
Mastery looks like: ${node.whatMasteryLooksLike}
Format: ${formatKey}${materialContent ? `\n\nCourse material (use this to make the activity specific to their content):\n${materialContent.slice(0, 4000)}` : ""}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("GenerationAgent returned no content");

  try {
    return JSON.parse(content) as GeneratedActivity;
  } catch {
    throw new Error("GenerationAgent returned invalid JSON");
  }
}
