"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { GoalCard } from "./GoalCard";
import { StepBuilder } from "./StepBuilder";
import { TaskBreakdownResults } from "./TaskBreakdownResults";
import type { TaskBreakdownGoal, GameStep, GameSubmitResult } from "@/types/games";

type Phase = "loading" | "planning" | "submitting" | "results" | "error";

const DEFAULT_STEPS: GameStep[] = [
  { text: "", estimatedMinutes: 15 },
  { text: "", estimatedMinutes: 15 },
  { text: "", estimatedMinutes: 15 },
];

export function TaskBreakdownGame() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challengeId") ?? undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [goal, setGoal] = useState<TaskBreakdownGoal | null>(null);
  const [steps, setSteps] = useState<GameStep[]>(DEFAULT_STEPS);
  const [result, setResult] = useState<GameSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGoal = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setSteps(DEFAULT_STEPS);
    setResult(null);
    try {
      const res = await fetch("/api/games/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "TASK_BREAKDOWN", challengeId }),
      });
      const data = await res.json() as { goal?: TaskBreakdownGoal; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setGoal(data.goal ?? null);
      setPhase("planning");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setPhase("error");
    }
  }, [challengeId]);

  useEffect(() => { void loadGoal(); }, [loadGoal]);

  const canSubmit = steps.filter((s) => s.text.trim().length > 0).length >= 3;

  async function handleSubmit() {
    if (!goal || !canSubmit) return;
    setPhase("submitting");
    const filledSteps = steps.filter((s) => s.text.trim().length > 0);
    try {
      const res = await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "TASK_BREAKDOWN", challengeId, goal: goal.text, steps: filledSteps }),
      });
      const data = await res.json() as GameSubmitResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setResult(data);
      setPhase("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
      setPhase("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Task Breakdown</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Decompose a vague goal into concrete, timed steps.</p>
      </div>

      <div className="glass-card glass-panel p-6">
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-8 h-8 rounded-full border-2 border-[#4ade80] border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Generating your goal…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => void loadGoal()}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/10 hover:bg-[#4ade80]/20 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {phase === "planning" && goal && (
          <div className="space-y-6">
            <GoalCard goal={goal.text} context={goal.context} />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Your plan — at least 3 steps
              </p>
              <StepBuilder steps={steps} onChange={setSteps} />
            </div>

            <button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] hover:bg-[#4ade80]/30"
            >
              {canSubmit ? "Submit Plan →" : `Add ${3 - steps.filter((s) => s.text.trim().length > 0).length} more step(s)`}
            </button>
          </div>
        )}

        {phase === "submitting" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-8 h-8 rounded-full border-2 border-[#4ade80] border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">AI is evaluating your plan…</p>
          </div>
        )}

        {phase === "results" && result && (
          <TaskBreakdownResults result={result} />
        )}
      </div>
    </div>
  );
}
