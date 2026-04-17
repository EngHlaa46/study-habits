"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Target,
  Play,
  Eye,
  Shield,
  Timer,
  Battery,
  LayoutGrid,
  Clock,
  CheckSquare,
  Lock,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/language";

interface SkillNode {
  id: string;
  slug: string;
  name: string;
  level: number;
  dimension: string;
  description: string;
  purpose: string;
  currentStatus: string;
  progress?: {
    weekPhase: number;
    stabilityScore: number;
    userTask: string | null;
  } | null;
}

interface SkillTreeProps {
  skills: SkillNode[];
}

const WEEK_LABELS: Record<number, string> = {
  1: "Stabilize",
  2: "Express",
  3: "Probe",
};

const LEVEL_NAMES: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Mastery",
};

// Dimension order for columns
const DIMENSIONS = ["planning", "behavioral", "cognitive"] as const;

const DIMENSION_CONFIG: Record<string, { color: string; bg: string; label: string; sub: string }> = {
  planning:   { color: "#38bdf8", bg: "rgba(56,189,248,0.07)",  label: "Planning & Prep", sub: "pre-session" },
  behavioral: { color: "#fbbf24", bg: "rgba(251,191,36,0.07)",  label: "Behavioural",     sub: "starting session" },
  cognitive:  { color: "#a855f7", bg: "rgba(168,85,247,0.07)",  label: "Cognitive",        sub: "during session" },
};

const SKILL_ICONS: Record<string, React.ElementType> = {
  "task-clarity":        Target,
  "initiation":          Play,
  "focus-containment":   Eye,
  "estimating-time":     Clock,
  "environment-control": Shield,
  "focus-endurance":     Timer,
  "flexible-planning":   LayoutGrid,
  "sticking-to-plan":    CheckSquare,
  "cognitive-recovery":  Battery,
};

function getCardStyle(status: string, dimColor: string) {
  switch (status) {
    case "available":
      return { borderColor: dimColor + "70", bg: "transparent", textColor: dimColor };
    case "active":
      return { borderColor: dimColor, bg: `${dimColor}0f`, textColor: dimColor };
    case "stable":
      return { borderColor: "#4ade80", bg: "rgba(74,222,128,0.07)", textColor: "#4ade80" };
    case "mastered":
      return { borderColor: "#fbbf24", bg: "rgba(251,191,36,0.07)", textColor: "#fbbf24" };
    default: // locked
      return { borderColor: "rgba(100,100,120,0.2)", bg: "transparent", textColor: "rgba(150,150,160,0.4)" };
  }
}

export function SkillTree({ skills }: SkillTreeProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<SkillNode | null>(null);
  const [userTask, setUserTask] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetTask = async (skillId: string) => {
    if (!userTask.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, action: "setTask", userTask }),
      });
      router.refresh();
      setSelected(null);
      setUserTask("");
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return t("skills.ready");
      case "active":    return t("skills.active");
      case "stable":    return t("skills.stable");
      case "mastered":  return t("skills.mastered");
      default:          return status;
    }
  };

  return (
    <>
      {/* Dimension column headers */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {DIMENSIONS.map((dim) => {
          const dc = DIMENSION_CONFIG[dim];
          return (
            <div key={dim} className="text-center">
              <p className="text-xs font-bold" style={{ color: dc.color }}>{dc.label}</p>
              <p className="text-[10px] text-muted-foreground/50">{dc.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Level rows */}
      {[1, 2, 3].map((level) => {
        const levelSkills = skills.filter((s) => s.level === level);
        const isLevelLocked = levelSkills.every((s) => s.currentStatus === "locked");
        const isLevelComplete = levelSkills.every(
          (s) => s.currentStatus === "stable" || s.currentStatus === "mastered"
        );

        return (
          <div key={level}>
            {/* Level header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className={`text-[11px] font-bold uppercase tracking-widest px-2 ${
                isLevelLocked
                  ? "text-muted-foreground/30"
                  : isLevelComplete
                  ? "text-[#4ade80]/70"
                  : "text-muted-foreground/60"
              }`}>
                Level {level} · {LEVEL_NAMES[level]}
              </span>
              {isLevelComplete && <CheckCircle2 size={11} className="text-[#4ade80]/70" />}
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* 3-column skill grid */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              {DIMENSIONS.map((dim) => {
                const skill = levelSkills.find((s) => s.dimension === dim);
                if (!skill) return <div key={dim} />;

                const dc = DIMENSION_CONFIG[dim];
                const s = getCardStyle(skill.currentStatus, dc.color);
                const Icon = SKILL_ICONS[skill.slug] ?? Target;
                const isActive = skill.currentStatus === "active";
                const isStable = skill.currentStatus === "stable" || skill.currentStatus === "mastered";
                const isLocked = skill.currentStatus === "locked";

                return (
                  <button
                    key={skill.id}
                    onClick={() => { setSelected(skill); setUserTask(skill.progress?.userTask ?? ""); }}
                    className="relative rounded-xl p-3 text-left transition-all hover:scale-[1.02] border"
                    style={{
                      borderColor: s.borderColor,
                      backgroundColor: s.bg || "transparent",
                      boxShadow: isActive ? `0 0 14px ${dc.color}20` : undefined,
                    }}
                  >
                    {isLocked && (
                      <Lock size={10} className="absolute top-2 right-2" style={{ color: "rgba(150,150,160,0.3)" }} />
                    )}

                    <Icon size={16} className="mb-2" style={{ color: s.textColor }} />

                    <p className="text-xs font-semibold leading-snug" style={{ color: s.textColor }}>
                      {skill.name}
                    </p>

                    {isActive && skill.progress && (
                      <div className="mt-2">
                        <div className="h-0.5 bg-secondary rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${skill.progress.stabilityScore * 100}%`,
                              backgroundColor: dc.color,
                            }}
                          />
                        </div>
                        <p className="text-[10px]" style={{ color: dc.color + "99" }}>
                          W{skill.progress.weekPhase} · {WEEK_LABELS[skill.progress.weekPhase]}
                        </p>
                      </div>
                    )}

                    {isStable && (
                      <CheckCircle2 size={12} className="mt-1.5" style={{ color: s.textColor }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Arrow to next level */}
            {level < 3 && (
              <div className="flex justify-center my-3">
                <ChevronDown size={16} className="text-muted-foreground/20" />
              </div>
            )}
          </div>
        );
      })}

      {/* Skill detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          {selected && (() => {
            const dc = DIMENSION_CONFIG[selected.dimension] ?? DIMENSION_CONFIG.planning;
            const Icon = SKILL_ICONS[selected.slug] ?? Target;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-foreground flex items-center gap-2">
                    <Icon size={18} style={{ color: dc.color }} />
                    {selected.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">{selected.description}</p>

                  <div className="bg-surface-inset rounded-lg p-3">
                    <p className="text-xs text-muted-foreground/70 mb-1">{t("skills.whyThisSkillLabel")}</p>
                    <p className="text-foreground/80 text-sm">{selected.purpose}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground/70">{t("skills.status")}</span>
                    <span className="capitalize" style={{ color: dc.color }}>{getStatusLabel(selected.currentStatus)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground/70">Dimension</span>
                    <span className="text-xs font-medium" style={{ color: dc.color }}>{dc.label}</span>
                  </div>

                  {selected.progress && selected.currentStatus === "active" && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground/70">{t("skills.week")}</span>
                        <span className="text-foreground/80">
                          {selected.progress.weekPhase}/3 · {WEEK_LABELS[selected.progress.weekPhase]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground/70">{t("skills.stability")}</span>
                        <span className="text-[#4ade80]">
                          {(selected.progress.stabilityScore * 100).toFixed(0)}%
                        </span>
                      </div>

                      {selected.progress.userTask ? (
                        <div className="bg-surface-inset rounded-lg p-3">
                          <p className="text-xs text-muted-foreground/70 mb-1">{t("skills.yourTask")}</p>
                          <p className="text-foreground/80 text-sm">{selected.progress.userTask}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-foreground/80 text-sm">{t("skills.defineTask")}</Label>
                          <Input
                            value={userTask}
                            onChange={(e) => setUserTask(e.target.value)}
                            placeholder={t("skills.taskPlaceholder")}
                            className="bg-surface-inset border-border text-foreground"
                          />
                          <Button
                            onClick={() => handleSetTask(selected.id)}
                            disabled={loading || !userTask.trim()}
                            className="w-full text-black"
                            style={{ backgroundColor: dc.color }}
                          >
                            {loading ? t("skills.saving") : t("skills.setTask")}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {selected.currentStatus === "locked" && (
                    <p className="text-muted-foreground/50 text-xs text-center">
                      Complete all Level {selected.level - 1} skills to unlock this level.
                    </p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
