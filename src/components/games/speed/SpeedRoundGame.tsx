"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { PixelPalm } from "@/components/games/palm/PixelPalm";
import type { PalmAnimationState } from "@/components/games/palm/palmData";
import type { SpeedQuestion } from "@/lib/ai/games/generateSpeedRound";
import type { SkillPalmState } from "@/types/gamification";

type Phase = "loading" | "countdown" | "playing" | "complete" | "error";

const DURATION = 60; // seconds

export function SpeedRoundGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const skillTreeId = searchParams.get("skillTreeId") ?? undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
  const [palmStage, setPalmStage] = useState(1);
  const [personalBest, setPersonalBest] = useState<{ score: number; correct: number } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [lastFeedback, setLastFeedback] = useState<"correct" | "wrong" | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [newPB, setNewPB] = useState(false);

  // Palm state
  const [palmState, setPalmStateObj] = useState<SkillPalmState | null>(null);
  const [localHealth, setLocalHealth] = useState(100);
  const [palmAnim, setPalmAnim] = useState<PalmAnimationState>("idle");
  const animLockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!skillTreeId) return;
    fetch("/api/gamification/profile")
      .then((r) => r.json())
      .then((data: { palms?: SkillPalmState[] }) => {
        const palm = data.palms?.find((p) => p.skillTreeId === skillTreeId) ?? null;
        if (palm) { setPalmStateObj(palm); setLocalHealth(palm.health); }
      })
      .catch(() => {});
  }, [skillTreeId]);

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setCorrectCount(0);
    setCurrentIndex(0);
    setTimeLeft(DURATION);
    setLastFeedback(null);
    setNewPB(false);
    try {
      const res = await fetch("/api/games/speed-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillTreeId }),
      });
      const data = await res.json() as {
        questions?: SpeedQuestion[];
        palmStage?: number;
        personalBest?: { score: number; correct: number } | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load speed round");
      setQuestions(data.questions ?? []);
      setPalmStage(data.palmStage ?? 1);
      setPersonalBest(data.personalBest ?? null);
      setPhase("countdown");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load speed round");
      setPhase("error");
    }
  }, [skillTreeId]);

  useEffect(() => { void load(); }, [load]);

  // Countdown: 3-2-1-GO
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Game timer
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("complete");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  // Palm flicker during last 10 seconds
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 10 && timeLeft > 0 && !animLockRef.current) {
      animLockRef.current = true;
      setPalmAnim("flicker");
      setTimeout(() => { setPalmAnim("idle"); animLockRef.current = false; }, 900);
    }
  }, [timeLeft, phase]);

  // On complete: award XP + check PB
  useEffect(() => {
    if (phase !== "complete") return;
    const total = Math.min(currentIndex + 1, questions.length);
    const score = total > 0 ? correctCount / total : 0;

    // Check personal best
    const isPB = !personalBest || correctCount > personalBest.correct;
    if (isPB && correctCount > 0) {
      setNewPB(true);
      void confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 }, colors: ["#fbbf24", "#f97316", "#4ade80"] });
      setPalmAnim("dateBurst");
    }

    // Save session + award XP
    if (skillTreeId) {
      void fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: "SPEED_ROUND",
          skillTreeId,
          questions: [],
          answers: [],
          questionsTotal: total,
          questionsCorrect: correctCount,
          score,
        }),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function triggerAnim(state: PalmAnimationState) {
    if (animLockRef.current) return;
    animLockRef.current = true;
    setPalmAnim(state);
    setTimeout(() => { setPalmAnim("idle"); animLockRef.current = false; }, 900);
  }

  function handleTrueFalse(answer: boolean) {
    if (phase !== "playing" || currentIndex >= questions.length) return;
    const q = questions[currentIndex];
    if (q.type !== "true_false") return;
    const isCorrect = answer === q.isTrue;
    processAnswer(isCorrect);
  }

  function handleMatch(index: number) {
    if (phase !== "playing" || currentIndex >= questions.length) return;
    const q = questions[currentIndex];
    if (q.type !== "match") return;
    const isCorrect = index === q.correctIndex;
    processAnswer(isCorrect);
  }

  function processAnswer(isCorrect: boolean) {
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setLocalHealth((h) => Math.min(100, h + 3));
      triggerAnim("sway");
    } else {
      setLocalHealth((h) => Math.max(0, h - 8));
      triggerAnim("wilt");
    }
    setLastFeedback(isCorrect ? "correct" : "wrong");
    setTimeout(() => {
      setLastFeedback(null);
      setCurrentIndex((i) => i + 1);
    }, 350);
  }

  const q = currentIndex < questions.length ? questions[currentIndex] : null;
  const timerPct = (timeLeft / DURATION) * 100;
  const timerColor = timeLeft > 20 ? "#4ade80" : timeLeft > 10 ? "#fbbf24" : "#f87171";
  const displayedPalmStage = palmState?.stage ?? palmStage;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Speed Round</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Answer as many as you can in 60 seconds
          {palmStage >= 3 && <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/25 text-[#fbbf24]">Stage {palmStage} difficulty</span>}
        </p>
      </div>

      {/* Countdown overlay */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={countdown}
                className="text-8xl font-black"
                style={{ color: countdown > 0 ? "#fbbf24" : "#4ade80" }}
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                {countdown > 0 ? countdown : "GO!"}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-5 items-start">
        {/* Palm + timer */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <PixelPalm
            stage={displayedPalmStage}
            health={localHealth}
            animationState={palmAnim}
            dateCount={palmState?.totalDates ?? 0}
            size="md"
          />

          {/* Circular timer */}
          {phase === "playing" && (
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                <motion.circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  stroke={timerColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - timerPct / 100)}`}
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums"
                style={{ color: timerColor }}
              >
                {timeLeft}
              </span>
            </div>
          )}

          {/* Score counter */}
          {phase === "playing" && (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-[#4ade80] tabular-nums">{correctCount}</span>
              <span className="text-[9px] text-muted-foreground/60">correct</span>
            </div>
          )}
        </div>

        {/* Question card */}
        <div className="flex-1 glass-card glass-panel p-6 min-h-[280px] flex flex-col">
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-4 py-12 m-auto">
              <div className="w-8 h-8 rounded-full border-2 border-[#4ade80] border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Preparing speed round…</p>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-4 py-10 text-center m-auto">
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={() => void load()} className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/10 hover:bg-[#4ade80]/20 transition-colors">
                Try Again
              </button>
            </div>
          )}

          {phase === "countdown" && (
            <div className="flex flex-col items-center gap-2 py-8 m-auto text-center">
              <p className="text-sm text-muted-foreground">Get ready…</p>
              {personalBest && (
                <p className="text-xs text-[#fbbf24]/70">Personal best: {personalBest.correct} correct</p>
              )}
            </div>
          )}

          {phase === "playing" && (
            <div className="flex flex-col flex-1">
              {/* Feedback flash */}
              <AnimatePresence>
                {lastFeedback && (
                  <motion.div
                    key={lastFeedback}
                    className="absolute inset-0 rounded-2xl pointer-events-none z-10"
                    style={{ background: lastFeedback === "correct" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </AnimatePresence>

              {q ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    className="flex flex-col flex-1 gap-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Question */}
                    <div className="flex-1 flex items-center">
                      <p className="text-base font-medium text-foreground leading-relaxed">
                        {q.type === "true_false" ? q.statement : q.prompt}
                      </p>
                    </div>

                    {/* Answers */}
                    {q.type === "true_false" && (
                      <div className="grid grid-cols-2 gap-3">
                        {([true, false] as const).map((val) => (
                          <motion.button
                            key={String(val)}
                            onClick={() => handleTrueFalse(val)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            className="py-4 rounded-xl text-sm font-bold border transition-all"
                            style={{
                              borderColor: val ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)",
                              background: val ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                              color: val ? "#4ade80" : "#f87171",
                            }}
                          >
                            {val ? "✓ True" : "✗ False"}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {q.type === "match" && (
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <motion.button
                            key={oi}
                            onClick={() => handleMatch(oi)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="py-2.5 px-3 rounded-xl text-xs font-medium border border-white/10 bg-white/[0.03] text-foreground text-left hover:bg-white/[0.07] transition-colors"
                          >
                            <span className="font-mono text-muted-foreground mr-1.5">{String.fromCharCode(65 + oi)}.</span>
                            {opt}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <p className="text-sm text-muted-foreground">Questions exhausted — wait for time!</p>
                </div>
              )}
            </div>
          )}

          {phase === "complete" && (
            <motion.div
              className="flex flex-col gap-5 flex-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {newPB && (
                <motion.div
                  className="text-center py-3 rounded-xl text-sm font-bold"
                  style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  🏆 New Personal Best!
                </motion.div>
              )}

              <div className="flex items-center justify-center gap-8 py-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-4xl font-black text-[#4ade80]">{correctCount}</span>
                  <span className="text-xs text-muted-foreground">correct</span>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-4xl font-black text-[#f87171]">{Math.min(currentIndex + 1, questions.length) - correctCount}</span>
                  <span className="text-xs text-muted-foreground">missed</span>
                </div>
                {personalBest && !newPB && (
                  <>
                    <div className="w-px h-12 bg-white/10" />
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-4xl font-black text-[#fbbf24]">{personalBest.correct}</span>
                      <span className="text-xs text-muted-foreground">best</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-auto">
                <motion.button
                  onClick={() => { setCountdown(3); void load(); }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/10 hover:bg-[#4ade80]/20 transition-colors"
                >
                  Play Again
                </motion.button>
                <motion.button
                  onClick={() => router.push("/games")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
                >
                  Back to Games
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
