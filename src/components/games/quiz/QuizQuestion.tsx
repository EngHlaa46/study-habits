"use client";

import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/motion";

interface QuizQuestionProps {
  question: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number | null;
  onSelect: (index: number) => void;
}

export function QuizQuestion({ question, options, selectedIndex, correctIndex, onSelect }: QuizQuestionProps) {
  const revealed = correctIndex !== null;

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
    >
      <p className="text-base font-medium text-foreground leading-relaxed">{question}</p>

      <motion.div
        className="grid gap-2.5"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {options.map((opt, i) => {
          let borderColor = "border-white/10";
          let bg = "bg-white/[0.04] hover:bg-white/[0.08]";
          let textColor = "text-foreground";
          let icon: string | null = null;
          const isCorrect = revealed && i === correctIndex;
          const isWrong = revealed && i === selectedIndex && i !== correctIndex;

          if (revealed) {
            if (isCorrect) {
              borderColor = "border-[#4ade80]/60";
              bg = "bg-[#4ade80]/10";
              textColor = "text-[#4ade80]";
              icon = "✓";
            } else if (isWrong) {
              borderColor = "border-red-400/60";
              bg = "bg-red-400/10";
              textColor = "text-red-400";
              icon = "✗";
            } else {
              bg = "bg-white/[0.02]";
              textColor = "text-muted-foreground";
            }
          } else if (i === selectedIndex) {
            borderColor = "border-primary/60";
            bg = "bg-primary/10";
          }

          return (
            <motion.button
              key={i}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } } }}
              animate={
                isCorrect
                  ? { scale: [1, 1.04, 1] }
                  : isWrong
                  ? { x: [0, -6, 6, -4, 4, 0] }
                  : {}
              }
              transition={isCorrect || isWrong ? { duration: 0.4 } : undefined}
              whileHover={!revealed ? { scale: 1.02 } : undefined}
              whileTap={!revealed ? { scale: 0.98 } : undefined}
              onClick={() => !revealed && onSelect(i)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors cursor-pointer disabled:cursor-default flex items-center gap-3 ${bg} ${borderColor} ${textColor}`}
            >
              <span className="text-xs font-mono text-muted-foreground/60 shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {icon && (
                <span className={`text-base font-bold shrink-0 ${i === correctIndex ? "text-[#4ade80]" : "text-red-400"}`}>
                  {icon}
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
