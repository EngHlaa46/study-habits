"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

const WEEK_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Stabilize", color: "text-primary" },
  2: { label: "Express",   color: "text-[#fbbf24]" },
  3: { label: "Probe",     color: "text-[#4ade80]" },
};

const DIMENSION_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  planning:   { color: "text-primary",    dot: "bg-primary",    label: "Planning" },
  behavioral: { color: "text-[#fbbf24]",  dot: "bg-[#fbbf24]",  label: "Behavioural" },
  cognitive:  { color: "text-[#a855f7]",  dot: "bg-[#a855f7]",  label: "Cognitive" },
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
}

interface PlanWidgetProps {
  activeSkills: ActiveSkillInfo[];
  levelNumber: number;
}

export function PlanWidget({ activeSkills, levelNumber }: PlanWidgetProps) {
  const levelName = LEVEL_NAMES[levelNumber] ?? `Level ${levelNumber}`;

  return (
    <Link
      href="/skills"
      className="block bg-card/60 backdrop-blur-md border border-white/[0.1] rounded-xl px-5 py-4 mb-6 hover:bg-card/80 transition-colors shadow-lg shadow-black/20 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Current Plan</p>
          <p className="text-sm font-semibold text-foreground">Level {levelNumber} · {levelName}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors">
          View Skills <ChevronRight size={13} />
        </div>
      </div>

      <div className="space-y-1.5">
        {activeSkills.map((skill) => {
          const dim = DIMENSION_CONFIG[skill.dimension] ?? DIMENSION_CONFIG.planning;
          const week = WEEK_CONFIG[skill.weekPhase] ?? WEEK_CONFIG[1];
          return (
            <div key={skill.name} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dim.dot}`} />
              <span className={`text-xs font-medium ${dim.color} w-20 shrink-0`}>{dim.label}</span>
              <span className="text-xs text-foreground/70 flex-1 truncate">{skill.name}</span>
              <span className={`text-[10px] ${week.color} shrink-0`}>W{skill.weekPhase} · {week.label}</span>
            </div>
          );
        })}
      </div>
    </Link>
  );
}
