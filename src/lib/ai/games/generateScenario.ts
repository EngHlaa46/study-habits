import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export interface ScenarioChoice {
  text: string;
  isCorrect: boolean;
  consequence: string; // shown after choosing
  palmEffect: "water" | "wilt";
}

export interface ScenarioStep {
  situation: string;
  choices: [ScenarioChoice, ScenarioChoice];
}

export interface Scenario {
  title: string;
  steps: ScenarioStep[];      // 3 steps
  skillName: string;
}

interface ScenarioNode {
  id: string;
  name: string;
  description: string;
  whatMasteryLooksLike: string;
}

export async function generateScenario(node: ScenarioNode): Promise<Scenario> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You create short choose-your-adventure study skill scenarios for students.

The scenario has exactly 3 sequential steps. Each step presents a realistic situation a student faces,
then offers 2 choices. One choice correctly applies the skill being trained; the other is a common mistake.

Return ONLY valid JSON with this exact structure:
{
  "title": "short scenario title (under 8 words)",
  "steps": [
    {
      "situation": "1-2 sentences describing the situation the student is in right now",
      "choices": [
        {
          "text": "Choice A text (under 15 words)",
          "isCorrect": true,
          "consequence": "1 sentence: what happens after choosing this (positive)",
          "palmEffect": "water"
        },
        {
          "text": "Choice B text (under 15 words)",
          "isCorrect": false,
          "consequence": "1 sentence: what happens after choosing this (realistic negative)",
          "palmEffect": "wilt"
        }
      ]
    }
  ]
}

Rules:
- Exactly 3 steps in the steps array
- Each step has exactly 2 choices in the choices array
- Randomize which choice (index 0 or 1) is correct across steps — do NOT always put the correct one first
- Situations should feel real and relatable (not abstract)
- Consequences should be educational, not preachy
- palmEffect is always "water" for correct and "wilt" for incorrect`,
      },
      {
        role: "user",
        content: `Create a 3-step scenario for the study skill:
Skill: ${node.name}
Description: ${node.description}
Mastery looks like: ${node.whatMasteryLooksLike}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1200,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No scenario content returned");

  const parsed = JSON.parse(content) as { title?: string; steps?: ScenarioStep[] };

  return {
    title: parsed.title ?? "Study Skill Scenario",
    steps: (parsed.steps ?? []).slice(0, 3),
    skillName: node.name,
  };
}
