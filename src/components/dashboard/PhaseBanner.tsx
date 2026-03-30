"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language";

interface PhaseBannerProps {
  phase: string;
  dayCount: number;
  activeSkillName?: string | null;
  weekPhase?: number;
}

export function PhaseBanner({
  phase,
  dayCount,
  activeSkillName,
  weekPhase,
}: PhaseBannerProps) {
  const { t } = useLanguage();

  const phaseLabels: Record<string, string> = {
    onboarding: t("phase.onboarding"),
    observation: t("phase.observation"),
    skill_training: t("phase.skill_training"),
  };

  const weekLabels: Record<number, string> = {
    1: t("skills.week1Label"),
    2: t("skills.week2Label"),
    3: t("skills.week3Label"),
  };

  const label = phaseLabels[phase] || phase;

  return (
    <div className="w-full rounded-xl bg-gradient-to-r from-[#38bdf8]/10 to-[#4ade80]/10 border border-border p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-[#38bdf8] text-[#38bdf8] text-xs"
          >
            {label}
          </Badge>
          {activeSkillName && (
            <span className="text-foreground/80 text-sm">
              {t("phase.activeLabel")} <span className="text-[#38bdf8]">{activeSkillName}</span>
            </span>
          )}
          {weekPhase && weekPhase > 0 && (
            <Badge
              variant="outline"
              className="border-[#4ade80] text-[#4ade80] text-xs"
            >
              {weekLabels[weekPhase]}
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground/70 text-sm">{t("phase.day")} {dayCount}</span>
      </div>
    </div>
  );
}
