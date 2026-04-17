"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";

export function NoSkillCard({ phase }: { phase: string }) {
  const { t } = useLanguage();
  return (
    <div className="bg-card/60 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-lg shadow-black/20 p-6">
      <h3 className="text-foreground text-lg font-semibold mb-2">
        {phase === "observation"
          ? t("dashboard.observationInProgress")
          : t("dashboard.noActiveSkill")}
      </h3>
      <p className="text-muted-foreground text-sm mb-3">
        {phase === "observation"
          ? t("dashboard.completeCheckins")
          : t("dashboard.visitSkillsPage")}
      </p>
      {phase !== "observation" && (
        <Link
          href="/skills"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-colors"
        >
          Go to Skills →
        </Link>
      )}
    </div>
  );
}
