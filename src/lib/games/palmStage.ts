// XP required to reach each palm stage (cumulative, per skill tree)
export const PALM_XP_THRESHOLDS = [0, 200, 500, 900, 1400, 2000];

// XP required to reach each global account level (cumulative)
export const GLOBAL_XP_THRESHOLDS = [0, 100, 300, 650, 1150, 1900];

export function computePalmStage(palmXP: number): number {
  for (let i = PALM_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (palmXP >= PALM_XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function computeGlobalLevel(totalXP: number): number {
  for (let i = GLOBAL_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= GLOBAL_XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function xpProgressToNextLevel(totalXP: number): { current: number; needed: number } {
  const level = computeGlobalLevel(totalXP);
  const currentThreshold = GLOBAL_XP_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = GLOBAL_XP_THRESHOLDS[level] ?? currentThreshold + 1000;
  return {
    current: totalXP - currentThreshold,
    needed: nextThreshold - currentThreshold,
  };
}

// Dates earned = 1 per correct answer (cosmetic counter on palm)
export function computeDatesEarned(correctAnswers: number): number {
  return correctAnswers;
}

// Health delta per session: correct ratio drives +/- health (capped 0-100)
export function computeHealthDelta(correctAnswers: number, totalAnswers: number): number {
  if (totalAnswers === 0) return 0;
  const ratio = correctAnswers / totalAnswers;
  // All correct → +15, all wrong → -15, 50% → 0
  return Math.round((ratio - 0.5) * 30);
}

export function clampHealth(current: number, delta: number): number {
  return Math.max(0, Math.min(100, current + delta));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

export interface StreakUpdate {
  newStreak: number;
  newLongest: number;
}

export function computeStreakUpdate(
  currentStreak: number,
  longestStreak: number,
  lastPlayedAt: Date | null,
  now: Date
): StreakUpdate {
  if (!lastPlayedAt) {
    return { newStreak: 1, newLongest: Math.max(1, longestStreak) };
  }
  if (isSameDay(lastPlayedAt, now)) {
    // Already played today — streak unchanged
    return { newStreak: currentStreak, newLongest: longestStreak };
  }
  if (isYesterday(lastPlayedAt, now)) {
    const newStreak = currentStreak + 1;
    return { newStreak, newLongest: Math.max(newStreak, longestStreak) };
  }
  // Streak broken
  return { newStreak: 1, newLongest: longestStreak };
}

export function computeStreakMultiplier(streak: number): number {
  return Math.min(streak, 5);
}

export function isDailyBonusAvailable(dailyBonusUsedAt: Date | null, now: Date): boolean {
  if (!dailyBonusUsedAt) return true;
  return !isSameDay(dailyBonusUsedAt, now);
}
