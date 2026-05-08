"use client";

interface GoalCardProps {
  goal: string;
  context: string;
}

export function GoalCard({ goal, context }: GoalCardProps) {
  return (
    <div
      className="glass-card glass-panel p-5 border-l-4 animate-in fade-in slide-in-from-top-2 duration-400"
      style={{ borderLeftColor: "#4ade80" }}
    >
      <p className="text-xs font-medium text-[#4ade80] mb-2 uppercase tracking-wider">{context}</p>
      <p className="text-sm font-medium text-foreground leading-relaxed">{goal}</p>
    </div>
  );
}
