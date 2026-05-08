"use client";

import { useRouter } from "next/navigation";
import type { GameSubmitResult } from "@/types/games";

interface QuizResultsProps {
  result: GameSubmitResult;
  total: number;
  correct: number;
}

function MiniStat({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div
        className="text-xl font-bold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </div>
      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 delay-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function QuizResults({ result, total, correct }: QuizResultsProps) {
  const router = useRouter();
  const pct = Math.round(result.score * 100);

  const scoreColor =
    pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171";

  const hasRetention = result.retentionScore !== undefined;
  const hasActive = result.activeScore !== undefined;
  const activePct = hasActive ? Math.round(result.activeScore! * 100) : null;
  const retentionPct = hasRetention ? Math.round(result.retentionScore! * 100) : null;

  // Warn if retention is slipping
  const retentionWarning = retentionPct !== null && retentionPct < 60;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Score ring */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div
          className="relative w-28 h-28 flex items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${scoreColor} ${pct * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
            boxShadow: `0 0 32px ${scoreColor}40`,
          }}
        >
          <div className="absolute inset-2 rounded-full bg-[#0d0d14] flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: scoreColor }}>{pct}%</span>
            <span className="text-xs text-muted-foreground/60">{correct}/{total}</span>
          </div>
        </div>
        <p className="text-sm text-foreground text-center max-w-xs leading-relaxed">{result.feedback}</p>
      </div>

      {/* Active vs retention split */}
      {(hasActive || hasRetention) && (
        <div
          className="glass-card glass-panel px-5 py-4 space-y-3"
          style={{ borderTop: `2px solid ${retentionWarning ? "#f8714420" : "#ffffff08"}` }}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score Breakdown</p>
          <div className="flex gap-6">
            {activePct !== null && (
              <MiniStat label="New material" pct={activePct} color="#a855f7" />
            )}
            {retentionPct !== null && (
              <MiniStat
                label="Retention check"
                pct={retentionPct}
                color={retentionWarning ? "#f87171" : "#4ade80"}
              />
            )}
          </div>
          {retentionWarning && (
            <p className="text-xs text-[#f87171] mt-1">
              ⚠ Some mastered skills are fading — quiz yourself on them again soon.
            </p>
          )}
        </div>
      )}

      {/* Per-node deltas */}
      {result.perNodeDeltas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mastery Updates</p>
          {result.perNodeDeltas.map((d) => (
            <div key={d.nodeId} className="flex items-center justify-between glass-card glass-panel px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                {d.isRetentionCheck && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/20 text-[#4ade80] shrink-0">
                    retention
                  </span>
                )}
                <span className="text-sm text-foreground truncate">{d.nodeName}</span>
              </div>
              <span
                className="text-xs font-mono font-semibold shrink-0 ml-3"
                style={{ color: d.delta >= 0 ? "#4ade80" : "#f87171" }}
              >
                {d.delta >= 0 ? "+" : ""}{Math.round(d.delta * 100)}% → {Math.round(d.newScore * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/games/quiz")}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[#a855f7]/40 text-[#a855f7] bg-[#a855f7]/10 hover:bg-[#a855f7]/20 transition-colors"
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
