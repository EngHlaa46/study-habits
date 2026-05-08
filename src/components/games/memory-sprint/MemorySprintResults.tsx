"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import confetti from "canvas-confetti";
import { staggerContainer, staggerItem } from "@/lib/motion";
import type { GameSubmitResult } from "@/types/games";

interface Props {
  result: GameSubmitResult;
  nodeName: string;
}

export function MemorySprintResults({ result, nodeName }: Props) {
  const router = useRouter();
  const pct = Math.round(result.score * 100);
  const scoreColor = pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#38bdf8";
  const delta = result.perNodeDeltas[0];
  const fired = useRef(false);

  useEffect(() => {
    if (!fired.current && pct >= 80) {
      fired.current = true;
      void confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#38bdf8", "#4ade80", "#a855f7", "#fbbf24"],
      });
    }
  }, [pct]);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={staggerItem} className="flex flex-col items-center gap-3 py-4">
        <motion.div
          className="text-5xl font-bold tabular-nums"
          style={{ color: scoreColor, textShadow: `0 0 32px ${scoreColor}60` }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
        >
          <CountUp end={pct} duration={1.3} suffix="%" />
        </motion.div>
        <p className="text-sm text-muted-foreground">{nodeName}</p>
        <p className="text-sm text-foreground text-center max-w-sm leading-relaxed">{result.feedback}</p>
      </motion.div>

      {delta && (
        <motion.div variants={staggerItem} className="glass-card glass-panel px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Mastery update</span>
          <div className="flex items-center gap-3">
            <div className="h-2 w-24 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${delta.newScore * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                style={{ backgroundColor: scoreColor }}
              />
            </div>
            <span
              className="text-xs font-mono font-semibold"
              style={{ color: delta.delta >= 0 ? "#4ade80" : "#f87171" }}
            >
              {delta.delta >= 0 ? "+" : ""}{Math.round(delta.delta * 100)}%
            </span>
          </div>
        </motion.div>
      )}

      <motion.div variants={staggerItem} className="flex gap-3">
        <motion.button
          onClick={() => router.push("/games/memory-sprint")}
          whileHover={{ scale: 1.03, boxShadow: "0 0 16px rgba(56,189,248,0.35)" }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[#38bdf8]/40 text-[#38bdf8] bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 transition-colors"
        >
          Try Another
        </motion.button>
        <motion.button
          onClick={() => router.push("/games")}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
        >
          Back to Games
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
