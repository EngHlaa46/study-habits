"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PixelPalm } from "@/components/games/palm/PixelPalm";
import type { GamificationProfile, SkillPalmState } from "@/types/gamification";

export function PalmWidget() {
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

  if (loading) {
    return (
      <div className="glass-card glass-panel p-4 flex items-center justify-center min-h-[120px]">
        <div className="w-5 h-5 rounded-full border-2 border-[#fbbf24] border-t-transparent animate-spin" />
      </div>
    );
  }

  // No palm yet (no materials uploaded) — show invite card
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
            <p className="text-xs text-muted-foreground mt-0.5">Upload materials to start growing</p>
          </div>
        </div>
        <button
          className="w-full py-2 rounded-xl text-xs font-semibold border border-[#fbbf24]/35 text-[#fbbf24] bg-[#fbbf24]/08 hover:bg-[#fbbf24]/15 transition-colors"
        >
          Go to Games →
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="glass-card glass-panel p-4 flex flex-col gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Palm + info row */}
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
            {streak > 0 && (
              <span className="text-[10px] text-[#f97316]">🔥 {streak}d</span>
            )}
            {dailyBonus && (
              <span className="text-[10px] text-[#38bdf8]">⚡ Boost ready</span>
            )}
            <span className="text-[10px] text-muted-foreground/60">{palm.totalDates} dates</span>
          </div>
          {/* Health bar */}
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

      {/* CTA */}
      <motion.button
        onClick={() => router.push(palm ? `/games?skillTreeId=${palm.skillTreeId}` : "/games")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2 rounded-xl text-xs font-semibold border transition-colors"
        style={
          wateredToday
            ? { borderColor: "rgba(255,255,255,0.08)", color: "var(--muted-foreground)", background: "rgba(255,255,255,0.03)" }
            : { borderColor: "rgba(74,222,128,0.3)", color: "#4ade80", background: "rgba(74,222,128,0.08)" }
        }
      >
        {wateredToday ? "Palm watered today ✓" : "💧 Water your palm →"}
      </motion.button>
    </motion.div>
  );
}
