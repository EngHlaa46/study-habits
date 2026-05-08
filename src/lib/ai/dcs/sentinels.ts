import type { UserData } from "@/lib/ai/buildContext";
import type { SentinelSignals, DimensionStrength, BehaviorSignals, CognitiveSignals, MetacognitiveSignals } from "./types";

function getDimensionStrength(
  skillProgresses: UserData["skillProgresses"],
  dimension: string
): DimensionStrength {
  const relevant = skillProgresses.filter(
    (sp) => (sp.skill as unknown as { dimension?: string | null }).dimension === dimension
  );
  if (relevant.length === 0) return "locked";
  const statuses = relevant.map((sp) => sp.status);
  if (statuses.includes("mastered") || statuses.includes("stable")) return "strong";
  if (statuses.includes("active")) return "developing";
  if (statuses.some((s) => s === "available")) return "early";
  return "locked";
}

export function runBehaviorSentinel(data: UserData): BehaviorSignals {
  const { skillProgresses, recentAssessments } = data;

  // Derive engagement signal from recent assessment activity
  const recentCount = recentAssessments.filter((s) => {
    const age = Date.now() - new Date(s.createdAt).getTime();
    return age < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const initiationRate7d = Math.min(recentCount / 7, 1);
  const consecutiveMisses = recentCount === 0 ? 3 : 0;

  const activeSkill = skillProgresses.find((sp) => sp.status === "active");

  return {
    initiationRate7d,
    consecutiveMisses,
    emotionalProcrastination: false,
    logisticalProcrastination: false,
    currentSkillWeek: activeSkill?.weekPhase ?? null,
    currentSkillName: activeSkill?.skill.name ?? null,
    dimensionStrength: getDimensionStrength(skillProgresses, "behavioral"),
  };
}

export function runCognitiveSentinel(data: UserData): CognitiveSignals {
  const { skillProgresses, recentAssessments } = data;

  // Derive focus proxy from calibration scores in recent assessments
  const calibrations = recentAssessments
    .filter((s) => s.calibrationScore != null)
    .map((s) => s.calibrationScore);
  const focusRate7d = calibrations.length > 0
    ? calibrations.reduce((a, b) => a + b, 0) / calibrations.length
    : 0.5;

  return {
    focusRate7d,
    avgEnergy: 3,
    avgMood: 3,
    topMethod: null,
    dimensionStrength: getDimensionStrength(skillProgresses, "cognitive"),
  };
}

export function runMetacognitiveSentinel(data: UserData): MetacognitiveSignals {
  const { skillProgresses, upcomingEvents } = data;

  const hasUpcomingEvents = upcomingEvents.length > 0;
  let daysToNearestEvent: number | null = null;
  if (upcomingEvents.length > 0) {
    daysToNearestEvent = Math.ceil(
      (upcomingEvents[0].date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    usesIntentions: false,
    hasUpcomingEvents,
    daysToNearestEvent,
    dimensionStrength: getDimensionStrength(skillProgresses, "metacognitive"),
  };
}

export function runSentinels(data: UserData): SentinelSignals {
  return {
    behavior: runBehaviorSentinel(data),
    cognitive: runCognitiveSentinel(data),
    metacognitive: runMetacognitiveSentinel(data),
  };
}

// Detect fixed-mindset language in a student message
export function detectFixedMindset(message: string): string[] {
  const patterns = [
    /\bi always\b/i,
    /\bi never\b/i,
    /\bi can't (no matter|ever|seem)/i,
    /\bi('m| am) (just |so )?(lazy|bad|terrible|hopeless|useless)/i,
    /\bi have no (willpower|discipline|motivation)/i,
    /\bnothing works( for me)?\b/i,
    /\bi('ve| have) tried everything\b/i,
    /\bi('m| am) not (a |smart|good|capable|disciplined)/i,
  ];
  return patterns
    .filter((p) => p.test(message))
    .map((p) => p.source);
}
