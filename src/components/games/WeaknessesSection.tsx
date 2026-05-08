import Link from "next/link";
import { Target } from "lucide-react";

export interface WeakNode {
  id: string;
  name: string;
  masteryScore: number;
  skillTreeId: string;
  skillTreeName: string;
}

export function WeaknessesSection({ nodes }: { nodes: WeakNode[] }) {
  if (nodes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Target size={15} className="text-red-400 shrink-0" />
        <h2 className="text-sm font-semibold text-foreground">Focus Areas</h2>
        <span className="text-xs text-muted-foreground/50">quiz yourself on what&apos;s slipping</span>
      </div>

      <div className="grid gap-2">
        {nodes.map((node) => {
          const pct = Math.round(node.masteryScore * 100);
          const barColor =
            pct < 30 ? "#f87171" : pct < 50 ? "#fbbf24" : "#a855f7";

          return (
            <div
              key={node.id}
              className="glass-card glass-panel px-4 py-3 flex items-center gap-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
                  <span
                    className="text-xs font-mono font-semibold shrink-0 tabular-nums"
                    style={{ color: barColor }}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 shrink-0 truncate max-w-[110px]">
                    {node.skillTreeName}
                  </p>
                </div>
              </div>

              <Link
                href={`/games/quiz?skillTreeId=${node.skillTreeId}`}
                className="px-3 py-1.5 rounded-lg bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-[#a855f7]/30 text-[#a855f7] text-xs font-semibold transition-all hover:scale-105 shrink-0"
              >
                Quiz
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
