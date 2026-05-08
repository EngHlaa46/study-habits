"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { PixelPalm } from "./PixelPalm";

interface LevelUpCeremonyProps {
  show: boolean;
  newStage: number;
  skillTreeName?: string;
  onDone: () => void;
}

const STAGE_NAMES = [
  "",
  "Seed Sprout",
  "Young Sprout",
  "Growing Palm",
  "Maturing Palm",
  "Full Date Palm",
  "Legendary Palm",
];

export function LevelUpCeremony({ show, newStage, skillTreeName, onDone }: LevelUpCeremonyProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!show || firedRef.current) return;
    firedRef.current = true;

    // Date-burst confetti (amber + orange + green)
    void confetti({
      particleCount: 220,
      spread: 130,
      origin: { y: 0.45 },
      colors: ["#C85A14", "#fbbf24", "#f97316", "#4ade80", "#D4A017"],
      scalar: 1.2,
    });

    // Auto-close after 3.5s
    const t = setTimeout(() => {
      firedRef.current = false;
      onDone();
    }, 3500);
    return () => clearTimeout(t);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: "rgba(6,26,46,0.92)", backdropFilter: "blur(8px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={onDone}
        >
          {/* Radial glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 45%, rgba(212,160,23,0.18) 0%, transparent 65%)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />

          {/* Palm */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
          >
            <PixelPalm
              stage={newStage}
              health={100}
              animationState="dateBurst"
              size="lg"
            />
          </motion.div>

          {/* Text */}
          <motion.div
            className="mt-6 flex flex-col items-center gap-2 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <motion.p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: "#fbbf24" }}
            >
              Palm Evolved
            </motion.p>
            <motion.h2
              className="text-3xl font-black text-white"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
              Stage {newStage}
            </motion.h2>
            <p className="text-lg font-bold" style={{ color: "#fbbf24" }}>
              {STAGE_NAMES[newStage] ?? "Legendary"}
            </p>
            {skillTreeName && (
              <p className="text-sm text-white/50 mt-1">{skillTreeName}</p>
            )}
          </motion.div>

          {/* Tap to dismiss hint */}
          <motion.p
            className="absolute bottom-10 text-xs text-white/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            Tap anywhere to continue
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
