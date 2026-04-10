import Groq from "groq-sdk";
import type { SentinelSignals, CoachOutputs } from "./types";

const COACH_MODEL = "llama-3.1-8b-instant";

async function callCoach(groq: Groq, systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const res = await groq.chat.completions.create({
      model: COACH_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });
    return res.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null; // fail silently — orchestrator proceeds without this coach
  }
}

export async function runCoaches(
  groq: Groq,
  signals: SentinelSignals,
  message: string,
  fixedMindsetPhrases: string[]
): Promise<CoachOutputs> {
  const { behavior, cognitive, metacognitive } = signals;

  const weekName = behavior.currentSkillWeek
    ? ["Not started", "Stabilize", "Express", "Probe"][behavior.currentSkillWeek] ?? "Unknown"
    : null;

  const behaviorPrompt = `You are the BehavioralCoach in a Distributed Cognitive Scaffolding (DCS) system.
Produce 2-3 concise internal coaching notes about this student's BEHAVIORAL dimension only.
These go to the InterventionOrchestrator — not shown to the student. Be specific, data-driven, under 15 words per bullet.

Signals:
- 7-day initiation rate: ${(behavior.initiationRate7d * 100).toFixed(0)}%
- Consecutive misses: ${behavior.consecutiveMisses}
- Emotional procrastination pattern: ${behavior.emotionalProcrastination}
- Logistical procrastination pattern: ${behavior.logisticalProcrastination}
- Active skill: ${behavior.currentSkillName ?? "none"} (Week ${behavior.currentSkillWeek ?? 0} — ${weekName ?? "n/a"})
- Behavioral dimension strength: ${behavior.dimensionStrength}

Student message: "${message}"`;

  const cognitivePrompt = `You are the CognitiveCoach in a Distributed Cognitive Scaffolding (DCS) system.
Produce 2-3 concise internal coaching notes about this student's COGNITIVE dimension only.
These go to the InterventionOrchestrator — not shown to the student. Be specific, data-driven, under 15 words per bullet.

Signals:
- 7-day focus rate: ${(cognitive.focusRate7d * 100).toFixed(0)}%
- Average energy (1-5): ${cognitive.avgEnergy.toFixed(1)}
- Average mood (1-5): ${cognitive.avgMood.toFixed(1)}
- Top performing study method: ${cognitive.topMethod ?? "insufficient data"}
- Cognitive dimension strength: ${cognitive.dimensionStrength}

Student message: "${message}"`;

  const metacognitivePrompt = `You are the MetacognitiveCoach in a Distributed Cognitive Scaffolding (DCS) system.
Produce 2-3 concise internal coaching notes about this student's METACOGNITIVE dimension only.
These go to the InterventionOrchestrator — not shown to the student. Be specific, data-driven, under 15 words per bullet.

Signals:
- Uses pre-session intentions: ${metacognitive.usesIntentions}
- Has upcoming events: ${metacognitive.hasUpcomingEvents}
- Days to nearest event: ${metacognitive.daysToNearestEvent ?? "none"}
- Metacognitive dimension strength: ${metacognitive.dimensionStrength}

Student message: "${message}"`;

  const coachSystem = "You are a specialist coaching agent. Output ONLY bullet points. No headers, no preamble.";

  const [behavioral, cognitiveOut, metacognitiveOut, mindset] = await Promise.all([
    callCoach(groq, coachSystem, behaviorPrompt),
    callCoach(groq, coachSystem, cognitivePrompt),
    callCoach(groq, coachSystem, metacognitivePrompt),
    fixedMindsetPhrases.length > 0
      ? callCoach(
          groq,
          "You are the MindsetInterventionAgent. Output ONE concise reframing note for the orchestrator. Under 30 words.",
          `Fixed-mindset language detected: ${fixedMindsetPhrases.slice(0, 3).join(", ")}\nStudent message: "${message}"\nProvide one evidence-based reframing angle the orchestrator should use.`
        )
      : Promise.resolve(null),
  ]);

  return {
    behavioral,
    cognitive: cognitiveOut,
    metacognitive: metacognitiveOut,
    mindset,
  };
}
