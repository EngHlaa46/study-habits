"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PixelPalm } from "@/components/games/palm/PixelPalm";
import type { GamificationProfile, SkillPalmState } from "@/types/gamification";

interface PalmWidgetProps {
  variant?: "widget" | "hero";
}

export function PalmWidget({ variant = "widget" }: PalmWidgetProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gamification/profile")
      .then((r) => r.json())
      .then((d: GamificationProfile) => { setProfile(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const palm: SkillPalmState | null = profile?.palms[0] ?? null;
  const streak = profile?.profile.currentStreak ?? 0;
  const dailyBonus = profile?.profile.dailyBonusAvailable ?? false;
  const wateredToday = palm?.wateredToday ?? false;

  const spinnerSize = variant === "hero" ? "min-h-[100px]" : "min-h-[120px]";

  if (loading) {
    return (
      <div className={`glass-card glass-panel p-4 flex items-center justify-center ${spinnerSize}`}>
        <div className="w-5 h-5 rounded-full border-2 border-[#fbbf24] border-t-transparent animate-spin" />
      </div>
    );
  }

  const ctaStyle = wateredToday
    ? { borderColor: "rgba(255,255,255,0.08)", color: "var(--muted-foreground)", background: "rgba(255,255,255,0.03)" }
    : { borderColor: "rgba(74,222,128,0.3)", color: "#4ade80", background: "rgba(74,222,128,0.08)" };
  const ctaLabel = wateredToday ? "Palm watered today ✓" : "💧 Water your palm →";
  const ctaHref = palm ? `/games?skillTreeId=${palm.skillTreeId}` : "/games";

  // No palm yet — show invite card
  if (!palm) {
    return (
      <motion.div
        className="glass-card glass-panel p-4 flex flex-col gap-3 cursor-pointer"
        whileHover={{ scale: 1.01 }}
        onClick={() => router.push("/games")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <PixelPalm stage={1} health={100} size="sm" />
          <div>
            <p className="text-sm font-semibold text-foreground">Plant your palm</p>
            <p className="text-xs text-muted-foreground mt-0.5">Play games to start growing your palm</p>
          </div>
        </div>
        <button className="w-full py-2 rounded-xl text-xs font-semibold border border-[#fbbf24]/35 text-[#fbbf24] bg-[#fbbf24]/08 hover:bg-[#fbbf24]/15 transition-colors">
          Go to Games →
        </button>
      </motion.div>
    );
  }

  // Hero variant — full-width horizontal banner at the top of the dashboard
  if (variant === "hero") {
    return (
      <motion.div
        className="glass-card glass-panel px-6 py-5 flex items-center gap-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PixelPalm
          stage={palm.stage}
          health={palm.health}
          animationState="idle"
          dateCount={palm.totalDates}
          size="md"
        />

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{palm.skillTreeName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/20 text-[#fbbf24] shrink-0">
              Stage {palm.stage}
            </span>
            {streak > 0 && (
              <span className="text-[10px] text-[#f97316] shrink-0">🔥 {streak}d streak</span>
            )}
            {dailyBonus && (
              <span className="text-[10px] text-[#38bdf8] shrink-0">⚡ Daily boost ready</span>
            )}
            <span className="text-[10px] text-muted-foreground/50 shrink-0">{palm.totalDates} dates</span>
          </div>

          {/* Health bar */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/40 mb-1">
              <span>Palm health</span>
              <span>{palm.health}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${palm.health}%` }}
                transition={{ duration: 0.6 }}
                style={{
                  backgroundColor: palm.health > 60 ? "#4ade80" : palm.health > 30 ? "#fbbf24" : "#f87171",
                }}
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          onClick={() => router.push(ctaHref)}
          whileHover={{ scale: 1.03, boxShadow: wateredToday ? "none" : "0 0 14px rgba(74,222,128,0.25)" }}
          whileTap={{ scale: 0.97 }}
          className="shrink-0 px-5 py-2.5 rounded-xl text-xs font-semibold border transition-colors"
          style={ctaStyle}
        >
          {ctaLabel}
        </motion.button>
      </motion.div>
    );
  }

  // Widget variant — compact card for use inside grids
  return (
    <motion.div
      className="glass-card glass-panel p-4 flex flex-col gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-end gap-3">
        <PixelPalm
          stage={palm.stage}
          health={palm.health}
          animationState="idle"
          dateCount={palm.totalDates}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-foreground truncate">{palm.skillTreeName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/20 text-[#fbbf24] shrink-0">
              Stage {palm.stage}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {streak > 0 && <span className="text-[10px] text-[#f97316]">🔥 {streak}d</span>}
            {dailyBonus && <span className="text-[10px] text-[#38bdf8]">⚡ Boost ready</span>}
            <span className="text-[10px] text-muted-foreground/60">{palm.totalDates} dates</span>
          </div>
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-2">
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${palm.health}%` }}
              transition={{ duration: 0.6 }}
              style={{
                backgroundColor: palm.health > 60 ? "#4ade80" : palm.health > 30 ? "#fbbf24" : "#f87171",
              }}
            />
          </div>
        </div>
      </div>
      <motion.button
        onClick={() => router.push(ctaHref)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2 rounded-xl text-xs font-semibold border transition-colors"
        style={ctaStyle}
      >
        {ctaLabel}
      </motion.button>
    </motion.div>
  );
}
