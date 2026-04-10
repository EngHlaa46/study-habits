export type DimensionStrength = "locked" | "early" | "developing" | "strong";

export interface BehaviorSignals {
  initiationRate7d: number;       // 0.0–1.0
  consecutiveMisses: number;
  emotionalProcrastination: boolean;
  logisticalProcrastination: boolean;
  currentSkillWeek: number | null;
  currentSkillName: string | null;
  dimensionStrength: DimensionStrength;
}

export interface CognitiveSignals {
  focusRate7d: number;            // 0.0–1.0
  avgEnergy: number;              // 1–5
  avgMood: number;                // 1–5
  topMethod: string | null;
  dimensionStrength: DimensionStrength;
}

export interface MetacognitiveSignals {
  usesIntentions: boolean;
  hasUpcomingEvents: boolean;
  daysToNearestEvent: number | null;
  dimensionStrength: DimensionStrength;
}

export interface SentinelSignals {
  behavior: BehaviorSignals;
  cognitive: CognitiveSignals;
  metacognitive: MetacognitiveSignals;
}

export interface CoachOutputs {
  behavioral: string | null;
  cognitive: string | null;
  metacognitive: string | null;
  mindset: string | null;
}
