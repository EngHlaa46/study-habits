"use client";

import { ExternalLink } from "lucide-react";
import { useLanguage } from "@/lib/language";

import { TOOLS } from "@/lib/tools-data";

const DIMENSION_COLORS: Record<string, string> = {
  cognitive: "text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20",
  metacognitive: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  behavioral: "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20",
};

const DIMENSION_KEYS: Record<string, string> = {
  cognitive: "dimension.cognitive",
  metacognitive: "dimension.metacognitive",
  behavioral: "dimension.behavioral",
};

export function ToolsPageClient({ weakestDim }: { weakestDim: string | null }) {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("tools.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("tools.subtitle")}</p>
        {weakestDim && (
          <p className="text-xs text-muted-foreground/60 mt-2">
            {t("tools.basedOnProfile")}{" "}
            <span className="text-primary">{t(DIMENSION_KEYS[weakestDim])}</span>{" "}
            {t("tools.dimensionHighlighted")}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {TOOLS.map((tool) => {
          const isRecommended = tool.dimension === weakestDim;
          return (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
              className={`block rounded-xl border p-5 transition-all hover:border-primary/40 hover:bg-card/80 ${
                isRecommended ? "border-primary/30 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{tool.name}</span>
                    {isRecommended && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                        {t("tools.recommendedForYou")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{t(`tools.${tool.key}.desc`)}</p>
                  <p className="text-xs text-muted-foreground/70 italic mb-3">{t(`tools.${tool.key}.when`)}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded border ${DIMENSION_COLORS[tool.dimension]}`}>
                      {t(DIMENSION_KEYS[tool.dimension])}
                    </span>
                    <span className="text-xs text-muted-foreground/50">{tool.badge}</span>
                  </div>
                </div>
                <ExternalLink size={16} className="text-muted-foreground/40 mt-1 shrink-0" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
