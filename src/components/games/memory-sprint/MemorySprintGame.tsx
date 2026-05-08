"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ConceptCard } from "./ConceptCard";
import { RecallInput } from "./RecallInput";
import { MemorySprintResults } from "./MemorySprintResults";
import type { MemoryCard, GameSubmitResult } from "@/types/games";

type Phase = "loading" | "reading" | "recall" | "evaluating" | "results" | "error";

export function MemorySprintGame() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challengeId") ?? undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [card, setCard] = useState<MemoryCard | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(12);
  const [recallText, setRecallText] = useState("");
  const [result, setResult] = useState<GameSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCard = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setRecallText("");
    setResult(null);
    try {
      const res = await fetch("/api/games/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "MEMORY_SPRINT", challengeId }),
      });
      const data = await res.json() as { card?: MemoryCard; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load card");
      setCard(data.card ?? null);
      setTimeRemaining(data.card?.displaySeconds ?? 12);
      setPhase("reading");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setPhase("error");
    }
  }, [challengeId]);

  useEffect(() => { void loadCard(); }, [loadCard]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "reading") return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("recall");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  async function handleSubmit(text: string) {
    if (!card) return;
    setPhase("evaluating");
    try {
      const res = await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "MEMORY_SPRINT", challengeId, card, recallText: text }),
      });
      const data = await res.json() as GameSubmitResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setResult(data);
      setPhase("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to evaluate");
      setPhase("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Memory Sprint</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Read the concept, then recall it from memory.</p>
      </div>

      <div className="glass-card glass-panel p-6 min-h-[360px] flex flex-col justify-center">
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-8 h-8 rounded-full border-2 border-[#38bdf8] border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading concept card…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => void loadCard()}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-[#38bdf8]/40 text-[#38bdf8] bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {phase === "reading" && card && (
          <ConceptCard
            name={card.name}
            summary={card.summary}
            timeRemaining={timeRemaining}
            totalTime={card.displaySeconds}
          />
        )}

        {phase === "recall" && (
          <RecallInput
            value={recallText}
            onChange={setRecallText}
            onSubmit={() => void handleSubmit(recallText)}
            onBlank={() => void handleSubmit("")}
            submitting={false}
          />
        )}

        {phase === "evaluating" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-8 h-8 rounded-full border-2 border-[#38bdf8] border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">AI is scoring your recall…</p>
          </div>
        )}

        {phase === "results" && result && card && (
          <MemorySprintResults result={result} nodeName={card.name} />
        )}
      </div>
    </div>
  );
}
