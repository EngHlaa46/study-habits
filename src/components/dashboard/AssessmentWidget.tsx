"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/language";

export function AssessmentWidget() {
  const { t } = useLanguage();
  const [text, setText] = useState<string | null | false>(null);

  useEffect(() => {
    fetch("/api/assessment")
      .then((r) => r.json())
      .then((data) => setText(data.text ?? false))
      .catch(() => setText(false));
  }, []);

  if (text === false) return null;

  return (
    <div className="bg-card/60 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-lg shadow-black/20 p-5">
      <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">
        {t("dashboard.recentPerformance")}
      </p>

      <AnimatePresence mode="wait">
        {text === null ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {[100, 83, 67].map((w, i) => (
              <motion.div
                key={i}
                className="h-3 bg-secondary rounded animate-pulse"
                style={{ width: `${w}%` }}
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.p
            key="text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="text-foreground/80 text-sm leading-relaxed"
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
