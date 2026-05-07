import Groq from "groq-sdk";

export interface CheckInQuestion {
  id: string;
  question: string;
}

export interface InferredSignals {
  studyInitiated: boolean | null;
  focusQuality: "none" | "low" | "moderate" | "high" | null;
  energyProxy: "low" | "moderate" | "high" | null;
  environmentalFactors: string | null;
  summary: string;
}

interface StudentContext {
  activeSkillName?: string;
  weekPhase?: number;
  recentPattern?: string; // e.g. "missed 2 days", "studied consistently"
  upcomingEvent?: string; // e.g. "exam in 3 days"
}

export async function generateCheckInQuestions(
  groq: Groq,
  context: StudentContext
): Promise<CheckInQuestion[]> {
  const contextBlock = [
    context.activeSkillName ? `Active skill: ${context.activeSkillName}` : null,
    context.weekPhase ? `Week phase: ${context.weekPhase}` : null,
    context.recentPattern ? `Recent pattern: ${context.recentPattern}` : null,
    context.upcomingEvent ? `Upcoming: ${context.upcomingEvent}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a psychologically-aware study coach. Generate 3 check-in questions for a student that surface their behavioral and environmental state WITHOUT asking them to rate or score anything.

PRINCIPLES:
- Never ask: "Rate your energy 1-5", "How was your focus?", "Did you study today?" — these are direct and invite biased self-report
- Ask conversational, open questions that let the student describe their day naturally
- From their answers, you will later infer: whether they studied, focus quality, energy level, environmental factors
- Questions should feel human, not clinical
- Vary the angle: one question about the day overall, one about study specifically (indirect), one about context/environment

OUTPUT: Return ONLY valid JSON:
{
  "questions": [
    { "id": "q1", "question": "..." },
    { "id": "q2", "question": "..." },
    { "id": "q3", "question": "..." }
  ]
}`,
      },
      {
        role: "user",
        content: contextBlock
          ? `Student context:\n${contextBlock}\n\nGenerate 3 check-in questions.`
          : "No specific context. Generate 3 general check-in questions.",
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 512,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return fallbackQuestions();

  try {
    const parsed = JSON.parse(content) as { questions: CheckInQuestion[] };
    return parsed.questions?.slice(0, 3) ?? fallbackQuestions();
  } catch {
    return fallbackQuestions();
  }
}

export async function interpretCheckInResponses(
  groq: Groq,
  questions: CheckInQuestion[],
  responses: string[]
): Promise<InferredSignals> {
  const qa = questions
    .map((q, i) => `Q: ${q.question}\nA: ${responses[i] ?? "(no answer)"}`)
    .join("\n\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are analyzing a student's check-in responses to infer their study session state. Based on what they wrote, extract the following signals. Be conservative — only mark something as true if the responses clearly support it.

OUTPUT: Return ONLY valid JSON:
{
  "studyInitiated": true | false | null,
  "focusQuality": "none" | "low" | "moderate" | "high" | null,
  "energyProxy": "low" | "moderate" | "high" | null,
  "environmentalFactors": "brief description of any notable environmental context mentioned, or null",
  "summary": "1-2 sentence neutral summary of this check-in"
}`,
      },
      {
        role: "user",
        content: `Student check-in responses:\n\n${qa}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 256,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return defaultSignals();

  try {
    return JSON.parse(content) as InferredSignals;
  } catch {
    return defaultSignals();
  }
}

function fallbackQuestions(): CheckInQuestion[] {
  return [
    { id: "q1", question: "How has your day been going overall?" },
    { id: "q2", question: "What did you end up spending your study time on today?" },
    { id: "q3", question: "Anything in your environment or headspace worth noting?" },
  ];
}

function defaultSignals(): InferredSignals {
  return {
    studyInitiated: null,
    focusQuality: null,
    energyProxy: null,
    environmentalFactors: null,
    summary: "",
  };
}
