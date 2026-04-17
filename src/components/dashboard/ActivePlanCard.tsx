"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language";

const WEEK_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Stabilize", color: "text-primary" },
  2: { label: "Express",   color: "text-[#fbbf24]" },
  3: { label: "Probe",     color: "text-[#4ade80]" },
};

const DIMENSION_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  planning:   { color: "text-primary",   dot: "bg-primary",   label: "Planning & Prep" },
  behavioral: { color: "text-[#fbbf24]", dot: "bg-[#fbbf24]", label: "Behavioural" },
  cognitive:  { color: "text-[#a855f7]", dot: "bg-[#a855f7]", label: "Cognitive" },
};

const LEVEL_NAMES: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Mastery",
};

interface ActiveSkillInfo {
  name: string;
  dimension: string;
  weekPhase: number;
  userTask: string | null;
}

interface ActivePlanCardProps {
  activeSkills: ActiveSkillInfo[];
  levelNumber: number;
  challenges: string[];
}

export function ActivePlanCard({ activeSkills, levelNumber, challenges }: ActivePlanCardProps) {
  const { t } = useLanguage();
  const levelName = LEVEL_NAMES[levelNumber] ?? `Level ${levelNumber}`;

  // Overall week phase to determine border color (use the most common, or min to stay conservative)
  const minWeek = Math.min(...activeSkills.map((s) => s.weekPhase), 1);
  const weekBorder = minWeek === 3 ? "border-[#4ade80]/40" : minWeek === 2 ? "border-[#fbbf24]/40" : "border-primary/40";

  return (
    <div className={`bg-card/60 backdrop-blur-md border-2 ${weekBorder} rounded-xl p-5 mb-6 shadow-lg shadow-black/20`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            {t("dashboard.currentPlan")}
          </span>
        </div>
        <Link
          href="/skills"
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-1 transition-colors"
        >
          {t("dashboard.skillTree")} <ChevronRight size={12} />
        </Link>
      </div>

      {/* Level */}
      <p className="text-foreground font-bold text-lg leading-tight mb-4">
        Level {levelNumber} · {levelName}
      </p>

      {/* Skills rows */}
      <div className="space-y-3 mb-4">
        {activeSkills.map((skill) => {
          const dim = DIMENSION_CONFIG[skill.dimension] ?? DIMENSION_CONFIG.planning;
          const week = WEEK_CONFIG[skill.weekPhase] ?? WEEK_CONFIG[1];

          return (
            <div key={skill.name} className="bg-surface-inset rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dim.dot}`} />
                <span className={`text-xs font-semibold ${dim.color}`}>{dim.label}</span>
                <span className="text-foreground/80 text-sm font-medium flex-1">{skill.name}</span>
                <span className={`text-[10px] ${week.color} shrink-0`}>
                  W{skill.weekPhase} · {week.label}
                </span>
              </div>
              {skill.userTask ? (
                <p className="text-xs text-muted-foreground/60 pl-3.5">{skill.userTask}</p>
              ) : (
                <p className="text-xs text-muted-foreground/40 pl-3.5 italic">
                  No task set —{" "}
                  <Link href="/skills" className="text-primary/70 hover:text-primary not-italic underline">
                    set in Skill Tree
                  </Link>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Challenges */}
      {challenges.length > 0 && (
        <div className="text-xs text-muted-foreground/50 pt-3 border-t border-border">
          {t("dashboard.workingAround")} {challenges.join(", ")}
        </div>
      )}
    </div>
  );
}
