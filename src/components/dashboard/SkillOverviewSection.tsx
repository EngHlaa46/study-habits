"use client";

import { useLanguage } from "@/lib/language";

interface SkillItem {
  id: string;
  skillName: string;
  skillTier: number;
  status: string;
}

export function SkillOverviewSection({ skills }: { skills: SkillItem[] }) {
  const { t } = useLanguage();

  const statusColors: Record<string, string> = {
    locked: "border-muted-foreground/30 text-muted-foreground/60",
    available: "border-border text-muted-foreground",
    active: "border-primary text-primary",
    stable: "border-[#4ade80] text-[#4ade80]",
    mastered: "border-[#fbbf24] text-[#fbbf24]",
  };

  return (
    <div className="mt-6">
      <h2 className="text-foreground text-lg font-semibold mb-4">
        {t("dashboard.skillOverview")}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {skills.map((sp) => {
          const colors = statusColors[sp.status] || statusColors.locked;
          return (
            <div key={sp.id} className={`border rounded-lg p-3 bg-card ${colors}`}>
              <p className="text-xs opacity-60 mb-1">
                {t("skills.tier")} {sp.skillTier}
              </p>
              <p className="text-sm font-medium">{sp.skillName}</p>
              <p className="text-xs capitalize mt-1 opacity-60">
                {t(`skills.${sp.status}`) || sp.status}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
