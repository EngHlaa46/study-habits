import { Suspense } from "react";
import { MemorySprintGame } from "@/components/games/memory-sprint/MemorySprintGame";

export default function MemorySprintPage() {
  return (
    <Suspense fallback={<GameSkeleton color="#38bdf8" />}>
      <MemorySprintGame />
    </Suspense>
  );
}

function GameSkeleton({ color }: { color: string }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="h-7 w-44 bg-white/[0.06] rounded-lg mb-6 animate-pulse" />
      <div className="glass-card glass-panel p-6 flex flex-col items-center gap-4 py-16">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${color}40`, borderTopColor: color }} />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
