"use client";

import { Card, CardContent } from "@/components/ui/card";
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

  const dimensions = [
    { key: "behavioral", label: t("dimension.behavioral") },
    { key: "cognitive", label: t("dimension.cognitive") },
    { key: "metacognitive", label: t("dimension.metacognitive") },
  ];

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 pb-5">
        <h3 className="text-foreground text-sm font-semibold mb-4 uppercase tracking-wide opacity-60">
          {t("dimension.profileTitle")}
        </h3>
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
