"use client";

interface HistoryHeaderProps {
  totalSessions: number;
  nodesPracticed: number;
  currentStreak: number;
}

export function HistoryHeader({ totalSessions, nodesPracticed, currentStreak }: HistoryHeaderProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-foreground mb-2">Activity</h1>
      <p className="text-muted-foreground text-sm mb-6">Your game sessions over the last 30 days.</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Sessions</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{nodesPracticed}</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Nodes Practiced</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#4ade80]">{currentStreak}</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Day Streak</p>
        </div>
      </div>
    </>
  );
}
