"use client";

import { useRouter } from "next/navigation";
import type { GameSubmitResult } from "@/types/games";

interface Props {
  result: GameSubmitResult;
  nodeName: string;
}

export function MemorySprintResults({ result, nodeName }: Props) {
  const router = useRouter();
  const pct = Math.round(result.score * 100);
  const scoreColor = pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#38bdf8";

  const delta = result.perNodeDeltas[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-3 py-4">
        <div
          className="text-5xl font-bold tabular-nums"
          style={{ color: scoreColor, textShadow: `0 0 32px ${scoreColor}60` }}
        >
          {pct}%
        </div>
        <p className="text-sm text-muted-foreground">{nodeName}</p>
        <p className="text-sm text-foreground text-center max-w-sm leading-relaxed">{result.feedback}</p>
      </div>

      {delta && (
        <div className="glass-card glass-panel px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Mastery update</span>
          <div className="flex items-center gap-3">
            <div className="h-2 w-24 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${delta.newScore * 100}%`, backgroundColor: scoreColor }}
              />
            </div>
            <span
              className="text-xs font-mono font-semibold"
              style={{ color: delta.delta >= 0 ? "#4ade80" : "#f87171" }}
            >
              {delta.delta >= 0 ? "+" : ""}{Math.round(delta.delta * 100)}%
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/games/memory-sprint")}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[#38bdf8]/40 text-[#38bdf8] bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 transition-colors"
        >
          Try Another
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
