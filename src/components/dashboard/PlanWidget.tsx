"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Dumbbell, Lock, CheckCircle2, CircleDot, BookOpen } from "lucide-react";

interface NodeSummary {
  id: string;
  name: string;
  masteryScore: number;
  masteryStatus: string;
  isDue: boolean;
}

interface TreeSummary {
  id: string;
  materialName: string;
  totalNodes: number;
  masteredNodes: number;
  activeNodes: NodeSummary[];
}

interface PlanWidgetProps {
  skillTrees: TreeSummary[];
}

const STATUS_ICON: Record<string, React.ElementType> = {
  locked: Lock,
  active: CircleDot,
  developing: CircleDot,
  mastered: CheckCircle2,
  maintenance: CheckCircle2,
};

const STATUS_COLOR: Record<string, string> = {
  locked: "text-muted-foreground/30",
  active: "text-primary",
  developing: "text-amber-400",
  mastered: "text-accent",
  maintenance: "text-accent/60",
};

export function PlanWidget({ skillTrees }: PlanWidgetProps) {
  if (skillTrees.length === 0) {
    return (
      <Link
        href="/materials"
        className="block bg-card/60 backdrop-blur-md border border-dashed border-white/[0.12] rounded-xl px-5 py-5 mb-6 hover:bg-card/80 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen size={16} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">No skill plan yet</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Upload your course material to generate a personalised skill tree</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
        </div>
      </Link>
    );
  }

  // Show the most recently updated tree that has active nodes, or the first tree
  const primaryTree =
    skillTrees.find((t) => t.activeNodes.length > 0) ?? skillTrees[0];

  const dueNodes = primaryTree.activeNodes.filter((n) => n.isDue);
  const progressPct = primaryTree.totalNodes > 0
    ? Math.round((primaryTree.masteredNodes / primaryTree.totalNodes) * 100)
    : 0;

  return (
    <div className="bg-card/60 backdrop-blur-md border border-white/[0.1] rounded-xl px-5 py-4 mb-6 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Current Plan</p>
          <p className="text-sm font-semibold text-foreground truncate">{primaryTree.materialName}</p>
        </div>
        <Link
          href="/materials"
          className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 ml-3"
        >
          View all <ChevronRight size={13} />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 mb-1">
          <span>{primaryTree.masteredNodes}/{primaryTree.totalNodes} nodes mastered</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      </div>

      {/* Due for practice */}
      {dueNodes.length > 0 && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
          <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Dumbbell size={10} />
            Ready to practice
          </p>
          <div className="space-y-1">
            {dueNodes.slice(0, 2).map((node) => (
              <div key={node.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-xs text-foreground/80 truncate flex-1">{node.name}</span>
                <span className="text-[10px] text-primary shrink-0">{Math.round(node.masteryScore * 100)}%</span>
              </div>
            ))}
            {dueNodes.length > 2 && (
              <p className="text-[10px] text-muted-foreground/50">+{dueNodes.length - 2} more</p>
            )}
          </div>
        </div>
      )}

      {/* Active nodes */}
      <div className="space-y-1.5">
        {primaryTree.activeNodes
          .filter((n) => !n.isDue)
          .slice(0, 4)
          .map((node) => {
            const Icon = STATUS_ICON[node.masteryStatus] ?? CircleDot;
            const color = STATUS_COLOR[node.masteryStatus] ?? "text-primary";
            return (
              <div key={node.id} className="flex items-center gap-2">
                <Icon size={11} className={`${color} shrink-0`} />
                <span className="text-xs text-foreground/70 flex-1 truncate">{node.name}</span>
                {node.masteryScore > 0 && (
                  <span className="text-[10px] text-muted-foreground/50 shrink-0">
                    {Math.round(node.masteryScore * 100)}%
                  </span>
                )}
              </div>
            );
          })}
      </div>

      {/* Other trees if any */}
      {skillTrees.length > 1 && (
        <p className="text-[10px] text-muted-foreground/40 mt-3 pt-3 border-t border-border/40">
          +{skillTrees.length - 1} other subject{skillTrees.length - 1 !== 1 ? "s" : ""} in your library
        </p>
      )}
    </div>
  );
}
