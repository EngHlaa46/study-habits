import Groq from "groq-sdk";

export interface ValidationResult {
  valid: boolean;
  reason: string;
}

/**
 * Quick pre-flight check using the fast 8b model.
 * Returns { valid: false, reason } if the input is gibberish, too vague,
 * or not a learnable subject. Costs ~100 tokens — runs before the 70b agent.
 */
export async function validateMaterial(
  groq: Groq,
  materialName: string,
  materialDescription: string
): Promise<ValidationResult> {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are a validator. Decide whether the user's input describes a real, learnable educational subject or course material.

Return ONLY a JSON object: { "valid": true/false, "reason": "short explanation" }

VALID examples: "Calculus", "Machine Learning", "Organic Chemistry", "Python Programming", "World War II", "Piano basics"
INVALID examples: single letters, random words, nonsense strings, empty phrases, things that are not learnable subjects (e.g. "r", "asdf", "I don't know", "hello")

Be lenient with abbreviations (e.g. "ML", "CS", "OOP" are valid). Reject only clear gibberish or non-subjects.`,
      },
      {
        role: "user",
        content: `Subject name: "${materialName}"\nAdditional context: "${materialDescription || "(none)"}"`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 80,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as { valid?: boolean; reason?: string };
    return {
      valid: parsed.valid === true,
      reason: parsed.reason ?? "Invalid subject",
    };
  } catch {
    return { valid: true, reason: "validation parse error — proceeding" };
  }
}

/**
 * Generates 4 short, specific study goal options relevant to the subject.
 * Runs in parallel with the SkillTreeAgent using the fast 8b model.
 */
export async function generateStudyGoals(
  groq: Groq,
  materialName: string,
  materialDescription: string
): Promise<string[]> {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `Generate exactly 4 short, distinct study goal options for a student studying the given subject.
Each goal should be a concrete, realistic aim (8 words max). Cover different motivations: exam/grade, project/application, career, and deep understanding.
Return ONLY valid JSON: { "goals": ["goal 1", "goal 2", "goal 3", "goal 4"] }`,
      },
      {
        role: "user",
        content: `Subject: "${materialName}"\nContext: "${materialDescription || "(none)"}"`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 120,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as { goals?: string[] };
    if (Array.isArray(parsed.goals) && parsed.goals.length > 0) {
      return parsed.goals.slice(0, 4);
    }
  } catch { /* fall through */ }
  return [];
}

/**
 * Extracts a structured outline from one or more converted Markdown files.
 * Combines content from all sources into a single course outline string.
 */
export async function extractCombinedOutline(
  groq: Groq,
  materialName: string,
  markdownSources: { fileName: string; markdownContent: string }[]
): Promise<string> {
  // Take first 2000 chars from each source to capture TOC / intro sections
  const snippets = markdownSources
    .map((s) => `=== ${s.fileName} ===\n${s.markdownContent.slice(0, 2000)}`)
    .join("\n\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You extract a unified course outline from one or more educational documents.
Read the provided document excerpts and produce a single, clean, structured outline covering all major topics.
Output ONLY the outline as a plain bulleted list using "- " prefixes. No intro sentence, no explanation.
Merge overlapping topics. Keep each line concise (under 12 words). Max 40 bullet points.`,
      },
      {
        role: "user",
        content: `Subject: "${materialName}"\n\nDocument excerpts:\n\n${snippets}`,
      },
    ],
    max_tokens: 800,
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

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
