"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { QuizQuestion } from "./QuizQuestion";
import { QuizResults } from "./QuizResults";
import type { QuizQuestion as QuizQuestionType, GameSubmitResult } from "@/types/games";

type Phase = "loading" | "question" | "feedback" | "submitting" | "results" | "error";

export function QuizGame() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challengeId") ?? undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestionType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<GameSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/games/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "QUIZ", challengeId }),
      });
      const data = await res.json() as { questions?: QuizQuestionType[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load quiz");
      setQuestions(data.questions ?? []);
      setCurrentIndex(0);
      setAnswers([]);
      setSelectedIndex(null);
      setPhase("question");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quiz");
      setPhase("error");
    }
  }, [challengeId]);

  useEffect(() => { void loadQuiz(); }, [loadQuiz]);

  function handleSelect(index: number) {
    if (phase !== "question") return;
    setSelectedIndex(index);
    setPhase("feedback");
  }

  async function handleNext() {
    if (selectedIndex === null) return;
    const newAnswers = [...answers, selectedIndex];
    setAnswers(newAnswers);

    if (currentIndex + 1 < questions.length) {
      setSelectedIndex(null);
      setCurrentIndex(currentIndex + 1);
      setPhase("question");
    } else {
      setPhase("submitting");
      try {
        const res = await fetch("/api/games/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameType: "QUIZ", challengeId, questions, answers: newAnswers }),
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
  }

  const q = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-foreground">Knowledge Quiz</h1>
          {phase !== "loading" && phase !== "error" && phase !== "results" && (
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {questions.length}
            </span>
          )}
        </div>
        {phase !== "loading" && phase !== "error" && phase !== "results" && questions.length > 0 && (
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#a855f7] rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + (phase === "feedback" ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="glass-card glass-panel p-6">
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-8 h-8 rounded-full border-2 border-[#a855f7] border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Generating questions from your materials…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => void loadQuiz()}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-[#a855f7]/40 text-[#a855f7] bg-[#a855f7]/10 hover:bg-[#a855f7]/20 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {(phase === "question" || phase === "feedback") && q && (
          <div className="space-y-5">
            <QuizQuestion
              question={q.question}
              options={q.options}
              selectedIndex={selectedIndex}
              correctIndex={phase === "feedback" ? q.correctIndex : null}
              onSelect={handleSelect}
            />

            {phase === "feedback" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <p className="text-xs text-muted-foreground">{q.explanation}</p>
                </div>
                <button
                  onClick={() => void handleNext()}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#a855f7] hover:bg-[#a855f7]/30 transition-colors"
                >
                  {currentIndex + 1 < questions.length ? "Next Question →" : "See Results →"}
                </button>
              </div>
            )}
          </div>
        )}

        {phase === "submitting" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-8 h-8 rounded-full border-2 border-[#a855f7] border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Calculating results…</p>
          </div>
        )}

        {phase === "results" && result && (
          <QuizResults result={result} total={questions.length} correct={Math.round(result.score * questions.length)} />
        )}
      </div>
    </div>
  );
}
