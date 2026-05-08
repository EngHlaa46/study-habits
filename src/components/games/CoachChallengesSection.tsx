"use client";

import { useRouter } from "next/navigation";
import type { GameChallengeClient } from "@/types/games";

const GAME_ROUTE: Record<string, string> = {
  QUIZ: "quiz",
  MEMORY_SPRINT: "memory-sprint",
  TASK_BREAKDOWN: "task-breakdown",
};

const GAME_COLORS: Record<string, string> = {
  QUIZ: "#a855f7",
  MEMORY_SPRINT: "#38bdf8",
  TASK_BREAKDOWN: "#4ade80",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "#4ade80",
  MEDIUM: "#fbbf24",
  HARD: "#f97316",
};

function getDueLabel(dueBy: string | null): string | null {
  if (!dueBy) return null;
  const days = Math.ceil((new Date(dueBy).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

interface Props {
  challenges: GameChallengeClient[];
}

export function CoachChallengesSection({ challenges }: Props) {
  const router = useRouter();

  if (challenges.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Coach Challenges</h2>

      <div className="flex flex-col gap-3">
        {challenges.map((c) => {
            const color = GAME_COLORS[c.gameType] ?? "#38bdf8";
            const dueLabel = getDueLabel(c.dueBy);
            const isOverdue = dueLabel === "Overdue";

            return (
              <div
                key={c.id}
                className="glass-card glass-panel px-5 py-4 flex items-center justify-between gap-4 group hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-foreground">{c.title}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full border"
                      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
                    >
                      {c.gameType.replace("_", " ")}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full border"
                      style={{
                        color: DIFFICULTY_COLORS[c.difficulty] ?? "#fbbf24",
                        borderColor: `${DIFFICULTY_COLORS[c.difficulty] ?? "#fbbf24"}40`,
                        backgroundColor: `${DIFFICULTY_COLORS[c.difficulty] ?? "#fbbf24"}15`,
                      }}
                    >
                      {c.difficulty}
                    </span>
                    {dueLabel && (
                      <span className={`text-xs font-medium ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                        {dueLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                </div>

                <button
                  onClick={() => router.push(`/games/${GAME_ROUTE[c.gameType] ?? "quiz"}?challengeId=${c.id}`)}
                  className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${color}30, ${color}15)`,
                    border: `1px solid ${color}50`,
                    color,
                  }}
                >
                  Play →
                </button>
              </div>
            );
          })}
        </div>
    </div>
  );
}
