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
  const { recentCheckIns, skillProgresses } = data;
  const last7 = recentCheckIns.slice(0, 7);

  const initiationRate7d = last7.length > 0
    ? last7.filter((c) => c.initiated).length / last7.length
    : 0;

  // Count consecutive misses from most recent
  let consecutiveMisses = 0;
  for (const ci of recentCheckIns) {
    if (!ci.initiated) consecutiveMisses++;
    else break;
  }

  const emotionalReasons = new Set(["Felt overwhelmed", "Wasn't in the mood", "Felt anxious"]);
  const logisticalReasons = new Set(["Too busy", "External event", "Forgot"]);
  let emotionalProcrastination = false;
  let logisticalProcrastination = false;

  const missReasonCount: Record<string, number> = {};
  for (const ci of recentCheckIns) {
    if (ci.missReason) {
      missReasonCount[ci.missReason] = (missReasonCount[ci.missReason] ?? 0) + 1;
    }
  }
  for (const [reason, count] of Object.entries(missReasonCount)) {
    if (count >= 3) {
      if (emotionalReasons.has(reason)) emotionalProcrastination = true;
      if (logisticalReasons.has(reason)) logisticalProcrastination = true;
    }
  }

  const activeSkill = skillProgresses.find((sp) => sp.status === "active");

  return {
    initiationRate7d,
    consecutiveMisses,
    emotionalProcrastination,
    logisticalProcrastination,
    currentSkillWeek: activeSkill?.weekPhase ?? null,
    currentSkillName: activeSkill?.skill.name ?? null,
    dimensionStrength: getDimensionStrength(skillProgresses, "behavioral"),
  };
}

export function runCognitiveSentinel(data: UserData): CognitiveSignals {
  const { recentCheckIns, skillProgresses } = data;
  const last7 = recentCheckIns.slice(0, 7);

  const focusRate7d = last7.length > 0
    ? last7.filter((c) => c.focusLevel === "focused" || c.focusLevel === "deep").length / last7.length
    : 0;

  const energyValues = last7.map((c) => c.energy).filter((e): e is number => e !== null);
  const moodValues = last7.map((c) => c.mood).filter((m): m is number => m !== null);
  const avgEnergy = energyValues.length > 0
    ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length
    : 3;
  const avgMood = moodValues.length > 0
    ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length
    : 3;

  // Find top performing study method
  const methodFocusMap: Record<string, { total: number; focused: number }> = {};
  for (const ci of last7) {
    let methods: string[] = [];
    try {
      if (ci.studyMethod) methods = JSON.parse(ci.studyMethod);
    } catch { /* ignore */ }
    for (const m of methods) {
      if (!methodFocusMap[m]) methodFocusMap[m] = { total: 0, focused: 0 };
      methodFocusMap[m].total++;
      if (ci.focusLevel === "focused" || ci.focusLevel === "deep") {
        methodFocusMap[m].focused++;
      }
    }
  }
  let topMethod: string | null = null;
  let bestRate = -1;
  for (const [method, { total, focused }] of Object.entries(methodFocusMap)) {
    if (total >= 2) {
      const rate = focused / total;
      if (rate > bestRate) {
        bestRate = rate;
        topMethod = method;
      }
    }
  }

  return {
    focusRate7d,
    avgEnergy,
    avgMood,
    topMethod,
    dimensionStrength: getDimensionStrength(skillProgresses, "cognitive"),
  };
}

export function runMetacognitiveSentinel(data: UserData): MetacognitiveSignals {
  const { recentCheckIns, skillProgresses, upcomingEvents } = data;
  const last7 = recentCheckIns.slice(0, 7);

  const usesIntentions = last7.some((c) => c.sessionIntention && c.sessionIntention.trim().length > 0);

  const hasUpcomingEvents = upcomingEvents.length > 0;
  let daysToNearestEvent: number | null = null;
  if (upcomingEvents.length > 0) {
    daysToNearestEvent = Math.ceil(
      (upcomingEvents[0].date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    usesIntentions,
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
