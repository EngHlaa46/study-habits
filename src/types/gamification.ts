export interface UserGameProfile {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: string | null;
  dailyBonusAvailable: boolean;
  globalLevel: number;
  xpToNextLevel: { current: number; needed: number };
}

export interface SkillPalmState {
  skillTreeId: string;
  skillTreeName: string;
  palmXP: number;
  totalDates: number;
  health: number;
  stage: number; // 1-6
  lastWateredAt: string | null;
  wateredToday: boolean;
}

export interface GamificationProfile {
  profile: UserGameProfile;
  palms: SkillPalmState[];
}

export interface XPAwardRequest {
  skillTreeId: string;
  correctAnswers: number;
  totalAnswers: number;
  gameType: string;
}

export interface XPAwardResult {
  xpAwarded: number;
  streakMultiplier: number;
  dailyBonus: boolean;
  newTotalXP: number;
  newPalmXP: number;
  oldPalmStage: number;
  newPalmStage: number;
  palmStageChanged: boolean;
  newStreak: number;
  datesEarned: number;
  healthDelta: number;
  newHealth: number;
}
