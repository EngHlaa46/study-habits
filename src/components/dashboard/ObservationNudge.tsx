"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";

export function ObservationNudge({ checkInCount }: { checkInCount: number }) {
  const { t } = useLanguage();
  return (
    <div className="mb-6 bg-card border border-primary/30 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-foreground font-semibold mb-1">
            {t("dashboard.observationMode")}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 whitespace-pre-line">
            {t("dashboard.observationText")}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-6 h-2 rounded ${
                    i <= checkInCount ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>
            <span className="text-muted-foreground text-xs">
              {Math.min(checkInCount, 5)}/5 {t("phase.checkIns")}
            </span>
          </div>
        </div>
        <Link
          href="/chat"
          className="shrink-0 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          {t("dashboard.talkToCoach")} →
        </Link>
      </div>
    </div>
  );
}
