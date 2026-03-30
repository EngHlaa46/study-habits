"use client";

import { useEffect } from "react";

// Maps hex to HSL values for --primary CSS variable (dark mode optimized)
const colorToHsl: Record<string, string> = {
  "#38bdf8": "199 89% 60%",  // cyan (default)
  "#a855f7": "270 91% 65%",  // purple
  "#f97316": "24 94% 53%",   // orange
  "#fbbf24": "43 96% 56%",   // amber
  "#4ade80": "142 71% 65%",  // green
  "#fb7185": "351 95% 71%",  // rose
};

export function ThemeApplier() {
  useEffect(() => {
    fetch("/api/user/theme-prefs")
      .then((r) => r.json())
      .then((prefs) => {
        const hsl = colorToHsl[prefs.accentColor];
        if (hsl) {
          document.documentElement.style.setProperty("--primary", hsl);
          document.documentElement.style.setProperty("--ring", hsl);
          document.documentElement.style.setProperty("--chart-1", hsl);
        }
      })
      .catch(() => {}); // silently fail — default theme remains
  }, []);

  return null;
}
