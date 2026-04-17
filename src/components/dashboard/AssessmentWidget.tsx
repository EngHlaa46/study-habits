"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language";

export function AssessmentWidget() {
  const { t } = useLanguage();
  const [text, setText] = useState<string | null | false>(null); // null=loading, false=no data

  useEffect(() => {
    fetch("/api/assessment")
      .then((r) => r.json())
      .then((data) => setText(data.text ?? false))
      .catch(() => setText(false));
  }, []);

  if (text === false) return null;

  return (
    <div className="bg-card/60 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-lg shadow-black/20 p-5">
      <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">
        {t("dashboard.recentPerformance")}
      </p>

      {text === null ? (
        <div className="space-y-2">
          <div className="h-3 bg-secondary rounded animate-pulse w-full" />
          <div className="h-3 bg-secondary rounded animate-pulse w-5/6" />
          <div className="h-3 bg-secondary rounded animate-pulse w-4/6" />
        </div>
      ) : (
        <p className="text-foreground/80 text-sm leading-relaxed">{text}</p>
      )}
    </div>
  );
}
