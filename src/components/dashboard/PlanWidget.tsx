"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

const WEEK_CONFIG: Record<number, { label: string; color: string; border: string }> = {
  1: { label: "Stabilize", color: "text-primary", border: "border-primary/30" },
  2: { label: "Express", color: "text-[#fbbf24]", border: "border-[#fbbf24]/30" },
  3: { label: "Probe", color: "text-[#4ade80]", border: "border-[#4ade80]/30" },
};

interface PlanWidgetProps {
  skillName: string;
  weekPhase: number;
}

export function PlanWidget({ skillName, weekPhase }: PlanWidgetProps) {
  const week = WEEK_CONFIG[weekPhase] ?? WEEK_CONFIG[1];

  return (
    <Link
      href="/skills"
      className={`flex items-center justify-between gap-4 bg-card/60 backdrop-blur-md border ${week.border} rounded-xl px-5 py-4 mb-6 hover:bg-card/80 transition-colors shadow-lg shadow-black/20 group`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <BookOpen size={15} className={week.color} />
        <div className="min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${week.color} mb-0.5`}>Current Plan</p>
          <p className="text-sm font-semibold text-foreground truncate">{skillName}</p>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded border ${week.border} ${week.color} bg-transparent`}>
          Week {weekPhase} · {week.label}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors">
        View Skill Tree <ChevronRight size={13} />
      </div>
    </Link>
  );
}
