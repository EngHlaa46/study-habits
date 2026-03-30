"use client";

import { useLanguage } from "@/lib/language";

interface HistoryHeaderProps {
  totalCheckIns: number;
  studiedDays: number;
  focusedDays: number;
}

export function HistoryHeader({ totalCheckIns, studiedDays, focusedDays }: HistoryHeaderProps) {
  const { t } = useLanguage();

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground mb-2">{t("history.checkInHistory")}</h1>
      <p className="text-muted-foreground text-sm mb-6">{t("history.trackPatterns")}</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalCheckIns}</p>
          <p className="text-muted-foreground/70 text-xs mt-1">{t("history.checkIns30d")}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{studiedDays}</p>
          <p className="text-muted-foreground/70 text-xs mt-1">{t("history.daysStudied")}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#4ade80]">{focusedDays}</p>
          <p className="text-muted-foreground/70 text-xs mt-1">{t("history.focusedPlusDays")}</p>
        </div>
      </div>
    </>
  );
}
