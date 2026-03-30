"use client";

import { useLanguage } from "@/lib/language";

export function NoSkillCard({ phase }: { phase: string }) {
  const { t } = useLanguage();
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-foreground text-lg font-semibold mb-2">
        {phase === "observation"
          ? t("dashboard.observationInProgress")
          : t("dashboard.noActiveSkill")}
      </h3>
      <p className="text-muted-foreground text-sm">
        {phase === "observation"
          ? t("dashboard.completeCheckins")
          : t("dashboard.visitSkillsPage")}
      </p>
    </div>
  );
}
