"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language";

const LEVEL_NAMES: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Mastery",
};

interface PhaseBannerProps {
  phase: string;
  dayCount: number;
  activeLevel?: number | null;
}

export function PhaseBanner({ phase, dayCount, activeLevel }: PhaseBannerProps) {
  const { t } = useLanguage();

  const phaseLabels: Record<string, string> = {
    onboarding: t("phase.onboarding"),
    skill_training: t("phase.skill_training"),
  };

  const label = phaseLabels[phase] || phase;

  return (
    <div className="glass-banner glass-panel w-full p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-[#38bdf8] text-[#38bdf8] text-xs">
            {label}
          </Badge>
          {activeLevel && phase === "skill_training" && (
            <span className="text-foreground/80 text-sm">
              Level {activeLevel} — <span className="text-[#38bdf8]">{LEVEL_NAMES[activeLevel] ?? ""}</span>
            </span>
          )}
        </div>
        <span className="text-muted-foreground/70 text-sm">{t("phase.day")} {dayCount}</span>
      </div>
    </div>
  );
}
