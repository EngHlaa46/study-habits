export type GameType = "QUIZ" | "MEMORY_SPRINT" | "TASK_BREAKDOWN";
export type GameDifficulty = "EASY" | "MEDIUM" | "HARD";
export type ChallengeStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED";

export interface QuizQuestion {
  id: string;
  nodeId: string;
  nodeName: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;        // why the correct answer is right
  optionExplanations?: string[]; // one entry per option: why each is right/wrong
  isRetentionCheck: boolean;   // true = mastered node being checked for longevity
  currentMasteryScore: number; // 0-1, used to calibrate question difficulty
}

export interface MemoryCard {
  nodeId: string;
  name: string;
  summary: string; // condensed 2-3 sentence version for display
  displaySeconds: number;
}

export interface TaskBreakdownGoal {
  text: string;
  sourceNodeIds: string[];
  context: string; // brief context hint (e.g. "Based on your Chemistry materials")
}

export interface GameStep {
  text: string;
  estimatedMinutes: number;
}

export interface NodeMasteryDelta {
  nodeId: string;
  nodeName: string;
  oldScore: number;
  newScore: number;
  delta: number;
  isRetentionCheck: boolean;
}

export interface TaskBreakdownScores {
  specificity: number;
  realism: number;
  coverage: number;
  composite: number;
  feedback: string;
}

export interface GameXPResult {
  xpAwarded: number;
  streakMultiplier: number;
  dailyBonus: boolean;
  newStreak: number;
  newPalmStage: number;
  palmStageChanged: boolean;
  datesEarned: number;
}

export interface GameSubmitResult {
  sessionId: string;
  score: number;
  activeScore?: number;
  retentionScore?: number;
  feedback: string;
  perNodeDeltas: NodeMasteryDelta[];
  breakdown?: TaskBreakdownScores;
  xp?: GameXPResult | null;
}

export interface GameChallengeClient {
  id: string;
  gameType: GameType;
  title: string;
  description: string;
  nodeIds: string[];
  difficulty: GameDifficulty;
  dueBy: string | null;
  status: ChallengeStatus;
  score: number | null;
  createdAt: string;
}
