import { Suspense } from "react";
import { QuizGame } from "@/components/games/quiz/QuizGame";

export default function QuizPage() {
  return (
    <Suspense fallback={<GameSkeleton color="#a855f7" />}>
      <QuizGame />
    </Suspense>
  );
}

function GameSkeleton({ color }: { color: string }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="h-7 w-40 bg-white/[0.06] rounded-lg mb-6 animate-pulse" />
      <div className="glass-card glass-panel p-6 flex flex-col items-center gap-4 py-16">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${color}40`, borderTopColor: color }} />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
