"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PixelPalm } from "@/components/games/palm/PixelPalm";
import { LevelUpCeremony } from "@/components/games/palm/LevelUpCeremony";
import type { PalmAnimationState } from "@/components/games/palm/palmData";
import type { Scenario, ScenarioChoice } from "@/lib/ai/games/generateScenario";
import type { SkillPalmState } from "@/types/gamification";

type Phase = "loading" | "playing" | "consequence" | "complete" | "error";

interface StepResult {
  situation: string;
  chosen: ScenarioChoice;
  stepIndex: number;
}

export function ScenarioGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const skillTreeId = searchParams.get("skillTreeId") ?? undefined;
  const nodeId = searchParams.get("nodeId") ?? undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [generatedNodeId, setGeneratedNodeId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [results, setResults] = useState<StepResult[]>([]);
  const [lastChosen, setLastChosen] = useState<ScenarioChoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Palm state
  const [palmState, setPalmState] = useState<SkillPalmState | null>(null);
  const [localHealth, setLocalHealth] = useState(100);
  const [palmAnim, setPalmAnim] = useState<PalmAnimationState>("idle");
  const animLockRef = useRef(false);
  const [showCeremony, setShowCeremony] = useState(false);
  const [ceremonyStage, setCeremonyStage] = useState(1);

  useEffect(() => {
    if (!skillTreeId) return;
    fetch("/api/gamification/profile")
      .then((r) => r.json())
      .then((data: { palms?: SkillPalmState[] }) => {
        const palm = data.palms?.find((p) => p.skillTreeId === skillTreeId) ?? null;
        if (palm) { setPalmState(palm); setLocalHealth(palm.health); }
      })
      .catch(() => {});
  }, [skillTreeId]);

  const loadScenario = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setStepIndex(0);
    setResults([]);
    setLastChosen(null);
    try {
      const res = await fetch("/api/games/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillTreeId, nodeId }),
      });
      const data = await res.json() as { scenario?: Scenario; nodeId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate scenario");
      setScenario(data.scenario ?? null);
      setGeneratedNodeId(data.nodeId ?? null);
      setPhase("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scenario");
      setPhase("error");
    }
  }, [skillTreeId, nodeId]);

  useEffect(() => { void loadScenario(); }, [loadScenario]);

  function triggerAnim(state: PalmAnimationState) {
    if (animLockRef.current) return;
    animLockRef.current = true;
    setPalmAnim(state);
    setTimeout(() => { setPalmAnim("idle"); animLockRef.current = false; }, 1600);
  }

  function handleChoice(choice: ScenarioChoice) {
    if (!scenario || phase !== "playing") return;
    const step = scenario.steps[stepIndex];

    setLastChosen(choice);
    setResults((prev) => [...prev, { situation: step.situation, chosen: choice, stepIndex }]);

    if (choice.palmEffect === "water") {
      triggerAnim("waterDrip");
      setLocalHealth((h) => Math.min(100, h + 8));
    } else {
      triggerAnim("wilt");
      setLocalHealth((h) => Math.max(0, h - 15));
    }

    setPhase("consequence");
  }

  function handleContinue() {
    if (!scenario) return;
    if (stepIndex + 1 < scenario.steps.length) {
      setStepIndex((i) => i + 1);
      setLastChosen(null);
      setPhase("playing");
    } else {
      setPhase("complete");
      // Award XP for the scenario (correct choices × 10 each)
      if (skillTreeId && generatedNodeId) {
        const correctCount = results.filter((r) => r.chosen.isCorrect).length;
        void fetch("/api/gamification/xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skillTreeId,
            correctAnswers: correctCount,
            totalAnswers: results.length,
            gameType: "SCENARIO",
          }),
        }).then((r) => r.json()).then((xp: { palmStageChanged?: boolean; newPalmStage?: number }) => {
          if (xp.palmStageChanged) {
            setCeremonyStage(xp.newPalmStage ?? 1);
            setShowCeremony(true);
          }
        }).catch(() => {});
      }
    }
  }

  const palmStage = palmState?.stage ?? 1;
  const correctCount = results.filter((r) => r.chosen.isCorrect).length;
  const score = scenario ? correctCount / scenario.steps.length : 0;

  const currentStep = scenario?.steps[stepIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <LevelUpCeremony
        show={showCeremony}
        newStage={ceremonyStage}
        skillTreeName={palmState?.skillTreeName}
        onDone={() => setShowCeremony(false)}
      />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Skill Scenario</h1>
        {scenario && phase !== "complete" && (
          <p className="text-sm text-muted-foreground mt-0.5">{scenario.title} · Step {stepIndex + 1}/{scenario.steps.length}</p>
        )}
      </div>

      <div className="flex gap-5 items-start">
        {/* Palm */}
        {phase !== "complete" && (
          <motion.div
            className="flex flex-col items-center gap-2 shrink-0"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <PixelPalm
              stage={palmStage}
              health={localHealth}
              animationState={palmAnim}
              dateCount={palmState?.totalDates ?? 0}
              size="md"
            />
            <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${localHealth}%` }}
                transition={{ duration: 0.5 }}
                style={{ backgroundColor: localHealth > 60 ? "#4ade80" : localHealth > 30 ? "#fbbf24" : "#f87171" }}
              />
            </div>
          </motion.div>
        )}

        {/* Scenario card */}
        <div className="flex-1 glass-card glass-panel p-6">
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-8 h-8 rounded-full border-2 border-[#38bdf8] border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Building your scenario…</p>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => void loadScenario()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-[#38bdf8]/40 text-[#38bdf8] bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {phase === "playing" && currentStep && (
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {/* Situation */}
              <div className="px-4 py-4 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <p className="text-[10px] font-semibold text-[#38bdf8] uppercase tracking-wider mb-2">Situation</p>
                <p className="text-sm text-foreground leading-relaxed">{currentStep.situation}</p>
              </div>

              {/* Choices */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">What do you do?</p>
                {currentStep.choices.map((choice, ci) => (
                  <motion.button
                    key={ci}
                    onClick={() => handleChoice(choice)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all"
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.03)",
                      color: "var(--foreground)",
                    }}
                  >
                    <span className="font-mono text-muted-foreground mr-2">
                      {String.fromCharCode(65 + ci)}.
                    </span>
                    {choice.text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "consequence" && lastChosen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              {/* Result banner */}
              <div
                className="px-4 py-4 rounded-xl border"
                style={{
                  background: lastChosen.isCorrect ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                  borderColor: lastChosen.isCorrect ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{lastChosen.isCorrect ? "💧" : "🍂"}</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: lastChosen.isCorrect ? "#4ade80" : "#f87171" }}
                  >
                    {lastChosen.isCorrect ? "Good call!" : "Not quite."}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{lastChosen.consequence}</p>
              </div>

              <motion.button
                onClick={handleContinue}
                whileHover={{ scale: 1.02, boxShadow: "0 0 16px rgba(56,189,248,0.3)" }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-[#38bdf8]/15 border border-[#38bdf8]/35 text-[#38bdf8] hover:bg-[#38bdf8]/25 transition-colors"
              >
                {scenario && stepIndex + 1 < scenario.steps.length ? "Next Situation →" : "See Results →"}
              </motion.button>
            </motion.div>
          )}

          {phase === "complete" && scenario && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Score */}
              <div className="flex flex-col items-center gap-3 py-4">
                <motion.div
                  className="relative w-24 h-24 flex items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(${score >= 0.7 ? "#4ade80" : "#fbbf24"} ${score * 360}deg, rgba(255,255,255,0.05) 0deg)`,
                    boxShadow: `0 0 28px ${score >= 0.7 ? "#4ade8040" : "#fbbf2440"}`,
                  }}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                >
                  <div className="absolute inset-2 rounded-full bg-[#0d0d14] flex flex-col items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: score >= 0.7 ? "#4ade80" : "#fbbf24" }}>
                      {correctCount}/{scenario.steps.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">correct</span>
                  </div>
                </motion.div>
                <p className="text-sm text-muted-foreground text-center">
                  {score === 1
                    ? "Perfect scenario run! Your palm is thriving."
                    : score >= 0.7
                    ? "Great choices. Keep applying this skill."
                    : "Tricky situations. Review the consequences above."}
                </p>
              </div>

              {/* Step recap */}
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: r.chosen.isCorrect ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)",
                      border: `1px solid ${r.chosen.isCorrect ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"}`,
                    }}
                  >
                    <span className="text-base shrink-0">{r.chosen.isCorrect ? "✓" : "✗"}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">{r.chosen.text}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{r.chosen.consequence}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => void loadScenario()}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[#38bdf8]/40 text-[#38bdf8] bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 transition-colors"
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
