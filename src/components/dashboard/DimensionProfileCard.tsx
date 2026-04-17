"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/language";

interface SkillEntry {
  dimension: string | null;
  status: string;
  stabilityScore: number;
}

interface DimensionProfileCardProps {
  skills: SkillEntry[];
}

function dimensionScore(skills: SkillEntry[], dim: string): number {
  const relevant = skills.filter((s) => s.dimension === dim);
  if (relevant.length === 0) return -1; // not yet unlocked
  const statusToScore: Record<string, number> = {
    locked: 0,
    available: 0.1,
    active: 0.25 + 0, // will add stabilityScore below
    stable: 0.75,
    mastered: 0.95,
  };
  const total = relevant.reduce((sum, s) => {
    if (s.status === "active") return sum + 0.25 + s.stabilityScore * 0.5;
    if (s.status === "stable") return sum + 0.75 + s.stabilityScore * 0.15;
    if (s.status === "mastered") return sum + 0.9 + s.stabilityScore * 0.1;
    return sum + (statusToScore[s.status] ?? 0);
  }, 0);
  return Math.min(1, total / relevant.length);
}

function scoreLabel(score: number, t: (k: string) => string): string {
  if (score < 0) return t("dimension.notYet");
  if (score < 0.2) return t("dimension.early");
  if (score < 0.55) return t("dimension.developing");
  if (score < 0.8) return t("dimension.strong");
  return t("dimension.mastered");
}

function scoreLabelColor(score: number): string {
  if (score < 0) return "text-muted-foreground/50";
  if (score < 0.2) return "text-muted-foreground";
  if (score < 0.55) return "text-[#fbbf24]";
  if (score < 0.8) return "text-primary";
  return "text-[#4ade80]";
}

export function DimensionProfileCard({ skills }: DimensionProfileCardProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const dimensions = [
    {
      key: "planning",
      label: t("dimension.planning") || "Planning & Prep",
      desc: t("dimension.planningDesc") || "Pre-session habits: defining tasks, estimating time, and flexible planning.",
    },
    {
      key: "behavioral",
      label: t("dimension.behavioral"),
      desc: t("dimension.behavioralDesc"),
    },
    {
      key: "cognitive",
      label: t("dimension.cognitive"),
      desc: t("dimension.cognitiveDesc"),
    },
  ];

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground text-sm font-semibold uppercase tracking-wide opacity-60">
            {t("dimension.profileTitle")}
          </h3>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {t("dimension.whatAreThese")}
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {expanded && (
          <div className="mb-4 space-y-2 border border-border rounded-lg p-3 bg-surface-inset">
            {dimensions.map(({ key, label, desc }) => (
              <div key={key}>
                <p className="text-xs font-medium text-foreground/70">{label}</p>
                <p className="text-xs text-muted-foreground/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {dimensions.map(({ key, label }) => {
            const score = dimensionScore(skills, key);
            const pct = score < 0 ? 0 : Math.round(score * 100);
            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-foreground/80 text-sm">{label}</span>
                  <span className={`text-xs font-medium ${scoreLabelColor(score)}`}>
                    {scoreLabel(score, t)}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%`, opacity: score < 0 ? 0.2 : 1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
