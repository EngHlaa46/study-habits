import Groq from "groq-sdk";
import type { GeneratedActivity } from "./generationAgent";

export interface AnalysisResult {
  overallScore: number;
  masteryDelta: number;
  calibrationAccuracy: number;
  strengths: string;
  weaknesses: string;
  aiNotes: string;
  recommendedNextNodeLocalId: string | null;
}

export function calculateSpacedRepetition(
  masteryScore: number,
  currentInterval: number
): { interval: number; nextReviewAt: Date } {
  let newInterval: number;
  if (masteryScore < 0.4) {
    newInterval = 1;
  } else if (masteryScore < 0.7) {
    newInterval = Math.max(2, Math.ceil(currentInterval * 1.5));
  } else if (masteryScore < 0.9) {
    newInterval = Math.max(3, Math.ceil(currentInterval * 2));
  } else {
    newInterval = Math.max(7, Math.ceil(currentInterval * 3));
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
  return { interval: newInterval, nextReviewAt };
}

export function calculateMasteryStatus(score: number, sessionCount: number): string {
  if (score >= 0.9 && sessionCount >= 3) return "maintenance";
  if (score >= 0.8 && sessionCount >= 2) return "mastered";
  if (score >= 0.4) return "developing";
  return "active";
}

export async function runAnalysisAgent(
  groq: Groq,
  node: { name: string; whatMasteryLooksLike: string; localId: string },
  activity: GeneratedActivity,
  studentResponse: string,
  confidenceLevel: number,
  availableNextNodes: { localId: string; name: string }[]
): Promise<AnalysisResult> {
  const activitySummary = activity.prompt
    || activity.questions?.join(" | ")
    || activity.code
    || "(activity)";

  const nextNodeOptions = availableNextNodes.length > 0
    ? `Available next nodes to recommend: ${availableNextNodes.map((n) => `${n.localId}: ${n.name}`).join(", ")}`
    : "No next nodes available yet.";

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are an expert learning analyst. Evaluate a student's response to an assessment activity.

OUTPUT: Return ONLY valid JSON:
{
  "overallScore": 0.0-1.0,
  "masteryDelta": -0.05 to 0.25,
  "strengths": "1-2 sentences on what they clearly understood",
  "weaknesses": "1-2 sentences on specific gaps or errors",
  "aiNotes": "2-3 sentences of personalized, actionable feedback to the student",
  "recommendedNextNodeLocalId": "localId string or null"
}

SCORING GUIDE:
- 0.0-0.3: response shows fundamental misunderstanding
- 0.3-0.6: partial understanding, significant gaps
- 0.6-0.8: solid understanding, minor gaps
- 0.8-1.0: response matches mastery description closely

masteryDelta: positive when score > 0.5, negative when score < 0.3, 0 otherwise
recommendedNextNodeLocalId: suggest the most logical next node to unlock from the available list, or null`,
      },
      {
        role: "user",
        content: `Skill: ${node.name}
Mastery looks like: ${node.whatMasteryLooksLike}

Activity (${activity.format}): ${activitySummary}

Student response: ${studentResponse}

Student's stated confidence before answering: ${confidenceLevel}/5

${nextNodeOptions}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 512,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AnalysisAgent returned no content");

  const parsed = JSON.parse(content) as Omit<AnalysisResult, "calibrationAccuracy">;

  // Calibration: compare confidence to actual score
  const expectedConfidence = parsed.overallScore * 5;
  const confidenceDiff = Math.abs(confidenceLevel - expectedConfidence);
  const calibrationAccuracy = Math.max(0, 1 - confidenceDiff / 4);

  return { ...parsed, calibrationAccuracy };
}
