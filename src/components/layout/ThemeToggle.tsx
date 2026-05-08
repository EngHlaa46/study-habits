"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useLanguage } from "@/lib/language";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.92, rotate: isDark ? 15 : -15 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-colors"
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "backOut" }}
          >
            <Sun size={18} />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "backOut" }}
          >
            <Moon size={18} />
          </motion.span>
        )}
      </AnimatePresence>
      <span className="text-sm font-medium">
        {isDark ? t("lightMode") : t("darkMode")}
      </span>
    </motion.button>
  );
}
