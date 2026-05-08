import Groq from "groq-sdk";
import type { QuizQuestion } from "@/types/games";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export interface QuizNode {
  id: string;
  name: string;
  description: string;
  whatMasteryLooksLike: string;
  masteryScore: number;
  isRetentionCheck: boolean;
}

// Maps mastery score to Bloom's-taxonomy difficulty band
function difficultyBand(score: number, isRetentionCheck: boolean): string {
  if (isRetentionCheck) {
    return `ANALYSIS — this node is mastered (${Math.round(score * 100)}%). Challenge the student to confirm the knowledge still holds:
  - "Why does X produce this outcome?" / "What distinguishes X from Y?" / "Which factor most influences X?"
  - Distractors must represent subtle analytical errors — no obvious wrong answers.
  - If the student can't answer this, their mastery is slipping.`;
  }

  if (score < 0.30) {
    return `RECOGNITION (mastery ${Math.round(score * 100)}%) — pure recall:
  - "What is X?" / "Which of these defines X?" / "X is best described as..."
  - Distractors can be plausible alternatives but should be clearly distinguishable on reflection.`;
  }
  if (score < 0.55) {
    return `COMPREHENSION (mastery ${Math.round(score * 100)}%) — explain and describe:
  - "How does X work?" / "What is the purpose of X?" / "Which statement about X is correct?"
  - Distractors should represent common misconceptions or partially correct ideas.`;
  }
  if (score < 0.75) {
    return `APPLICATION (mastery ${Math.round(score * 100)}%) — use and apply:
  - "Which approach applies when...?" / "What happens if X is used in scenario Y?" / "When is X most appropriate?"
  - Distractors should be plausible but incorrect applications.`;
  }
  if (score < 0.90) {
    return `ANALYSIS (mastery ${Math.round(score * 100)}%) — break down and compare:
  - "Why does X produce this result?" / "What distinguishes X from Y?" / "Which factor most influences X?"
  - Distractors must require careful reasoning to eliminate.`;
  }
  // 0.90+
  return `SYNTHESIS/PROBE (mastery ${Math.round(score * 100)}%) — edge cases and transfer:
  - "In which scenario would X NOT apply?" / "If X changed, what happens to Y?" / "A student confuses X with Z — what's the key distinction?"
  - Distractors must be sophisticated; only deep knowledge should distinguish them.`;
}

export async function generateQuiz(nodes: QuizNode[], materialContent?: string): Promise<QuizQuestion[]> {
  if (nodes.length === 0) return [];

  const nodeInstructions = nodes.map((n) => {
    const band = difficultyBand(n.masteryScore, n.isRetentionCheck);
    const tag = n.isRetentionCheck ? "[RETENTION CHECK]" : "[ACTIVE LEARNING]";
    return `${tag}
Node ID: ${n.id}
Concept: ${n.name}
Description: ${n.description}
Mastery looks like: ${n.whatMasteryLooksLike}
Question difficulty required: ${band}`;
  }).join("\n\n---\n\n");

  const materialSection = materialContent
    ? `\n\n---\nSOURCE MATERIAL (ground your questions in specific facts, terminology, examples, and phrasing from this content — do NOT invent details not present here):\n${materialContent.slice(0, 5000)}`
    : "";

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You generate adaptive multiple-choice quiz questions for a study mastery system.

Each node specifies an exact difficulty level based on the student's current mastery score. You MUST match the difficulty described — questions that are too easy for a high-mastery node or too hard for a low-mastery node are wrong.
${materialContent ? "\nWhen source material is provided, every question must reference specific content from it — exact terminology, examples, formulas, or facts. Never ask generic questions that could apply to any textbook." : ""}
Return ONLY valid JSON object:
{
  "questions": [
    {
      "nodeId": "the exact node ID string",
      "nodeName": "concept name",
      "question": "question text (under 35 words)",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "1 clear sentence: why the correct answer is right",
      "optionExplanations": [
        "Option A: correct — [one sentence why it is right]",
        "Option B: incorrect — [one sentence: what the student likely assumed and why it fails]",
        "Option C: incorrect — [one sentence: what sounds plausible but is actually wrong]",
        "Option D: incorrect — [one sentence: why this is ruled out]"
      ]
    }
  ]
}

Rules:
- Exactly one question per node
- correctIndex is the 0-based index of the correct option
- All 4 options must be plausible — no obviously absurd distractors
- Match the difficulty band exactly as specified for each node
- optionExplanations must have exactly 4 entries matching the options array order
- Wrong-option explanations should name the specific misconception, not just say "it is wrong"
- Explanations must be educational, not just restatements of the answer`,
      },
      {
        role: "user",
        content: `Generate one question per node:\n\n${nodeInstructions}${materialSection}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No quiz content returned");

  const parsed = JSON.parse(content) as { questions?: Omit<QuizQuestion, "id" | "isRetentionCheck" | "currentMasteryScore">[] };
  const raw = parsed.questions ?? [];

  // Merge in isRetentionCheck and currentMasteryScore from our node map
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return raw.map((q, i) => {
    const node = nodeMap.get(q.nodeId);
    return {
      ...q,
      id: `q-${i}`,
      isRetentionCheck: node?.isRetentionCheck ?? false,
      currentMasteryScore: node?.masteryScore ?? 0,
    };
  });
}
