"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PixelPalm } from "@/components/games/palm/PixelPalm";
import type { GamificationProfile, SkillPalmState } from "@/types/gamification";
import { PALM_XP_THRESHOLDS, GLOBAL_XP_THRESHOLDS } from "@/lib/games/palmStage";

interface GamesHeroProps {
  skillTreeId?: string;
  skillTreeName?: string;
}

export function GamesHero({ skillTreeId, skillTreeName }: GamesHeroProps) {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gamification/profile")
      .then((r) => r.json())
      .then((d: GamificationProfile) => { setProfile(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activePalm: SkillPalmState | null =
    profile?.palms.find((p) => p.skillTreeId === skillTreeId) ??
    profile?.palms[0] ??
    null;

  const p = profile?.profile;
  const stage = activePalm?.stage ?? 1;
  const palmXP = activePalm?.palmXP ?? 0;
  const nextPalmThreshold = PALM_XP_THRESHOLDS[stage] ?? palmXP + 500;
  const prevPalmThreshold = PALM_XP_THRESHOLDS[stage - 1] ?? 0;
  const palmPct = nextPalmThreshold > prevPalmThreshold
    ? Math.round(((palmXP - prevPalmThreshold) / (nextPalmThreshold - prevPalmThreshold)) * 100)
    : 100;

  const globalLevel = p?.globalLevel ?? 1;
  const xpProgress = p?.xpToNextLevel ?? { current: 0, needed: 100 };
  const globalPct = Math.round((xpProgress.current / xpProgress.needed) * 100);
  const nextGlobalThreshold = GLOBAL_XP_THRESHOLDS[globalLevel] ?? (p?.totalXP ?? 0) + 1000;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-7 h-7 rounded-full border-2 border-[#fbbf24] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: "linear-gradient(135deg, #061a2e 0%, #0d1a0d 60%, #1a0d00 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Starfield dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 3 === 0 ? 2 : 1,
              height: i % 3 === 0 ? 2 : 1,
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 23 + 7) % 60}%`,
              backgroundColor: i % 4 === 0 ? "#fbbf24" : "rgba(255,255,255,0.4)",
            }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2 + (i % 3), delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </div>

      <div className="relative flex gap-6 items-end">
        {/* Palm */}
        <div className="shrink-0">
          <PixelPalm
            stage={stage}
            health={activePalm?.health ?? 100}
            animationState="idle"
            dateCount={activePalm?.totalDates ?? 0}
            size="lg"
          />
        </div>

        {/* Stats */}
        <div className="flex-1 flex flex-col gap-4 pb-2">
          {/* Skill name + stage */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-[#fbbf24] uppercase tracking-wider">
                {activePalm ? (skillTreeName ?? activePalm.skillTreeName) : "Palm Grove"}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/25 text-[#fbbf24]">
                Stage {stage}/6
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              {stage === 6 ? "Legendary Palm" :
               stage === 5 ? "Full Date Palm" :
               stage === 4 ? "Maturing Palm" :
               stage === 3 ? "Growing Palm" :
               stage === 2 ? "Young Sprout" : "Seed Sprout"}
            </h2>
          </div>

          {/* Palm XP bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[#fbbf24]/70 font-semibold uppercase tracking-wider">Palm Growth</span>
              <span className="text-[10px] text-muted-foreground font-mono">{palmXP} / {nextPalmThreshold} XP</span>
            </div>
            <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #C85A14, #fbbf24)" }}
                initial={{ width: 0 }}
                animate={{ width: `${palmPct}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              />
            </div>
          </div>

          {/* Global XP bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[#38bdf8]/70 font-semibold uppercase tracking-wider">Account Level {globalLevel}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{p?.totalXP ?? 0} / {nextGlobalThreshold} XP</span>
            </div>
            <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#38bdf8]"
                initial={{ width: 0 }}
                animate={{ width: `${globalPct}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              />
            </div>
          </div>

          {/* Streak + daily bonus row */}
          <div className="flex items-center gap-3 flex-wrap">
            {(p?.currentStreak ?? 0) > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}
              >
                🔥 {p!.currentStreak} day streak
              </div>
            )}
            {p?.dailyBonusAvailable && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.25)", color: "#38bdf8" }}
              >
                ⚡ 1.5× daily boost available
              </div>
            )}
            {activePalm && !activePalm.wateredToday && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}
              >
                💧 Water your palm today
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
