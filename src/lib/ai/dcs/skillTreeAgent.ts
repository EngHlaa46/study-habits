import Groq from "groq-sdk";

export interface SkillNodeInput {
  id: string;
  name: string;
  description: string;
  whatMasteryLooksLike: string;
  prerequisites: string[];
  suggestedEvalFormat: string;
}

export async function runSkillTreeAgent(
  groq: Groq,
  materialText: string,
  materialName: string
): Promise<SkillNodeInput[]> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are an expert learning scientist and curriculum designer. Your task is to analyze educational material and build a skill tree that models the progression from novice to genuine mastery.

CRITICAL PRINCIPLES:
- Model what MASTERS of this material actually do, understand, and can demonstrate — not just topic headings
- The structure must emerge entirely from the content — no fixed number of levels or layers
- Each node is a distinct, learnable capability, not a chapter or topic title
- Prerequisites reflect genuine cognitive dependencies: you cannot do B without A
- "whatMasteryLooksLike" must be specific and observable: what can a master DO or EXPLAIN that a beginner cannot?
- suggestedEvalFormat must match the nature of the skill

Valid suggestedEvalFormat values:
- "recall_quiz" — for factual recall, definitions, terminology
- "matching_game" — for associations, vocabulary, symbol-meaning pairs
- "problem_solving" — for applying rules or methods to solve problems
- "code_debugging" — for finding and fixing errors in code or logic
- "explanation_prompt" — for conceptual depth: "explain why...", "teach this to a beginner"
- "analogy_task" — for abstract understanding: "how is X like Y in a different domain?"
- "creative_challenge" — for generative/open-ended application

OUTPUT: Return ONLY a valid JSON object with this exact structure — no other text:
{
  "nodes": [
    {
      "id": "node_1",
      "name": "Short skill name (4-6 words max)",
      "description": "What this skill is and why it matters on the path to mastery",
      "whatMasteryLooksLike": "Specific observable description: a master can [do X] without [scaffolding Y], even when [challenging condition Z]",
      "prerequisites": [],
      "suggestedEvalFormat": "recall_quiz"
    }
  ]
}

Rules:
- Generate 6–20 nodes depending on material complexity
- Node ids must be "node_1", "node_2", etc.
- prerequisites is an array of node ids that must be mastered before this node
- Root nodes (no prerequisites) can be practiced immediately
- Do not add any explanation, markdown, or text outside the JSON object`,
      },
      {
        role: "user",
        content: `Analyze this material and build a mastery-based skill tree.\n\nMaterial title: "${materialName}"\n\n---\n\n${materialText.slice(0, 14000)}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("SkillTreeAgent returned no content");

  const parsed = JSON.parse(content) as { nodes: SkillNodeInput[] };
  if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
    throw new Error("SkillTreeAgent returned invalid node structure");
  }

  return parsed.nodes;
}
