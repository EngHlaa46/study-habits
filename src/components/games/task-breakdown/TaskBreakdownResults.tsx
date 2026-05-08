"use client";

import { useRouter } from "next/navigation";
import type { GameSubmitResult } from "@/types/games";

interface Props {
  result: GameSubmitResult;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 delay-200"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function TaskBreakdownResults({ result }: Props) {
  const router = useRouter();
  const pct = Math.round(result.score * 100);
  const scoreColor = pct >= 75 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#38bdf8";
  const bd = result.breakdown;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-2 py-4">
        <div
          className="text-5xl font-bold tabular-nums"
          style={{ color: scoreColor, textShadow: `0 0 32px ${scoreColor}60` }}
        >
          {pct}
        </div>
        <p className="text-xs text-muted-foreground">composite score</p>
        <p className="text-sm text-foreground text-center max-w-sm leading-relaxed mt-1">{result.feedback}</p>
      </div>

      {bd && (
        <div className="space-y-3">
          <ScoreBar label="Specificity" value={bd.specificity} color="#38bdf8" />
          <ScoreBar label="Realism" value={bd.realism} color="#fbbf24" />
          <ScoreBar label="Coverage" value={bd.coverage} color="#4ade80" />
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/games/task-breakdown")}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/10 hover:bg-[#4ade80]/20 transition-colors"
        >
          Play Again
        </button>
        <button
          onClick={() => router.push("/games")}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
        >
          Back to Games
        </button>
      </div>
    </div>
  );
}
