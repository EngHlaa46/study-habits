"use client";

import { useLanguage } from "@/lib/language";

export function SkillsPageHeader() {
  const { t } = useLanguage();
  return (
    <>
      <h1 className="text-2xl font-bold text-foreground mb-2">{t("dashboard.skillTree")}</h1>
      <p className="text-muted-foreground text-sm mb-4">{t("skills.treeSubtitle")}</p>
      <div className="bg-card border border-border rounded-xl px-4 py-3 mb-8 text-sm text-muted-foreground">
        {t("skills.unlockInfoPre")}{" "}
        <span className="text-[#4ade80] font-medium">{t("skills.stable")}</span>{" "}
        {t("skills.unlockInfoPost")}
      </div>
    </>
  );
}
