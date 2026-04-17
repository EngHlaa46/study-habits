"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language";

interface ActivePlanCardProps {
  skillName: string;
  skillDescription: string;
  weekPhase: number;
  challenges: string[];
  userTask: string | null;
}

export function ActivePlanCard({ skillName, skillDescription, weekPhase, challenges, userTask }: ActivePlanCardProps) {
  const { t } = useLanguage();

  const weekConfig: Record<number, { label: string; color: string; border: string; instruction: string }> = {
    1: {
      label: t("skills.week1Label"),
      color: "text-primary",
      border: "border-primary/40",
      instruction: t("plan.week1Instruction"),
    },
    2: {
      label: t("skills.week2Label"),
      color: "text-[#fbbf24]",
      border: "border-[#fbbf24]/40",
      instruction: t("plan.week2Instruction"),
    },
    3: {
      label: t("skills.week3Label"),
      color: "text-[#4ade80]",
      border: "border-[#4ade80]/40",
      instruction: t("plan.week3Instruction"),
    },
  };

  const week = weekConfig[weekPhase] ?? weekConfig[1];

  return (
    <div className={`bg-card/60 backdrop-blur-md border-2 ${week.border} rounded-xl p-5 mb-6 shadow-lg shadow-black/20`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className={week.color} />
          <span className={`text-xs font-bold uppercase tracking-widest ${week.color}`}>
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

      {/* Skill + week */}
      <div className="mb-4">
        <h2 className="text-foreground font-bold text-lg leading-tight">{skillName}</h2>
        <p className="text-muted-foreground text-sm mt-0.5">{skillDescription}</p>
      </div>

      {/* Week phase badge + instruction */}
      <div className="bg-surface-inset rounded-lg p-3 mb-4">
        <p className={`text-xs font-semibold mb-1 ${week.color}`}>{week.label}</p>
        <p className="text-foreground/80 text-sm">{week.instruction}</p>
      </div>

      {/* User task */}
      {userTask ? (
        <div className="bg-surface-inset rounded-lg p-3 mb-3">
          <p className="text-xs text-muted-foreground/60 mb-1">{t("dashboard.yourTask")}</p>
          <p className="text-foreground/90 text-sm font-medium">{userTask}</p>
        </div>
      ) : (
        <div className="bg-surface-inset rounded-lg p-3 mb-3 border border-dashed border-border">
          <p className="text-muted-foreground/60 text-sm">
            {t("dashboard.noTaskDefined")} —{" "}
            <Link href="/skills" className="text-primary hover:underline">
              {t("dashboard.setTaskInSkillPage")}
            </Link>
          </p>
        </div>
      )}

      {/* Challenges */}
      {challenges.length > 0 && (
        <div className="text-xs text-muted-foreground/50 pt-3 border-t border-border">
          {t("dashboard.workingAround")} {challenges.join(", ")}
        </div>
      )}
    </div>
  );
}
