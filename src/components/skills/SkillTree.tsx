"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Target,
  Play,
  Eye,
  Shield,
  Timer,
  Battery,
  LayoutGrid,
  CalendarDays,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/lib/language";

interface SkillNode {
  id: string;
  slug: string;
  name: string;
  tier: number;
  description: string;
  purpose: string;
  currentStatus: string;
  prereqsMet: boolean;
  prerequisites: { name: string; slug: string; met: boolean }[];
  progress?: {
    weekPhase: number;
    stabilityScore: number;
    userTask: string | null;
  } | null;
}

interface SkillTreeProps {
  skills: SkillNode[];
  canActivate: boolean;
}

const tierConfig: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: "#38bdf8", bg: "rgba(56,189,248,0.07)",  label: "Foundation" },
  2: { color: "#a855f7", bg: "rgba(168,85,247,0.07)", label: "Structure"  },
  3: { color: "#f97316", bg: "rgba(249,115,22,0.07)", label: "Endurance"  },
  4: { color: "#fbbf24", bg: "rgba(251,191,36,0.07)", label: "Mastery"    },
};

const skillIconMap: Record<string, React.ElementType> = {
  "task-clarity":        Target,
  "initiation":          Play,
  "focus-containment":   Eye,
  "environment-control": Shield,
  "focus-endurance":     Timer,
  "cognitive-recovery":  Battery,
  "planning-sequencing": LayoutGrid,
  "deadline-calibration": CalendarDays,
};

// [fromCardIndex, toCardIndex] (0 = left card, 1 = right card) between tier N and tier N+1
const tierConnections: Record<number, [number, number][]> = {
  1: [[0, 0], [0, 1], [1, 0], [1, 1]], // both T1 skills → both T2 skills
  2: [[0, 0], [0, 1], [1, 1]],          // FC→FE, FC→CR, EC→CR
  3: [[0, 0], [1, 0]],                   // FE→PS, CR→PS (both converge left)
};

function getCardStyle(status: string, tier: number) {
  const tc = tierConfig[tier] ?? tierConfig[1];
  switch (status) {
    case "available":
      return { borderColor: tc.color + "70", bg: tc.bg, textColor: tc.color, iconColor: tc.color };
    case "active":
      return { borderColor: tc.color, bg: tc.bg, textColor: tc.color, iconColor: tc.color };
    case "stable":
      return { borderColor: "#4ade80", bg: "rgba(74,222,128,0.07)", textColor: "#4ade80", iconColor: "#4ade80" };
    case "mastered":
      return { borderColor: "#fbbf24", bg: "rgba(251,191,36,0.07)", textColor: "#fbbf24", iconColor: "#fbbf24" };
    default: // locked
      return { borderColor: "rgba(100,100,120,0.25)", bg: "transparent", textColor: "rgba(150,150,160,0.45)", iconColor: "rgba(150,150,160,0.3)" };
  }
}

export function SkillTree({ skills, canActivate }: SkillTreeProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<SkillNode | null>(null);
  const [userTask, setUserTask] = useState("");
  const [loading, setLoading] = useState(false);

  const handleActivate = async (skillId: string) => {
    setLoading(true);
    try {
      await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, action: "activate" }),
      });
      router.refresh();
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

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
      case "active": return t("skills.active");
      case "stable": return t("skills.stable");
      case "mastered": return t("skills.mastered");
      default: return status;
    }
  };

  return (
    <>
      <div>
        {[1, 2, 3, 4].map((tier) => {
          const tierSkills = skills.filter((s) => s.tier === tier);
          const tc = tierConfig[tier];
          const connections = tierConnections[tier];

          return (
            <div key={tier}>
              {/* Tier label */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tc.color }} />
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: tc.color + "bb" }}
                >
                  {t("skills.tier")} {tier} — {tc.label}
                </span>
              </div>

              {/* Skill cards */}
              <div className="grid grid-cols-2 gap-3">
                {tierSkills.map((skill) => {
                  const s = getCardStyle(skill.currentStatus, tier);
                  const Icon = skillIconMap[skill.slug] ?? Target;
                  const isLocked = skill.currentStatus === "locked";
                  const isActive = skill.currentStatus === "active";
                  const isStableOrMastered =
                    skill.currentStatus === "stable" || skill.currentStatus === "mastered";

                  return (
                    <button
                      key={skill.id}
                      onClick={() => setSelected(skill)}
                      className="relative rounded-xl p-4 text-left transition-all hover:scale-[1.02] border-2"
                      style={{
                        borderColor: s.borderColor,
                        backgroundColor: s.bg || "var(--card)",
                        boxShadow: isActive ? `0 0 18px ${tc.color}28` : undefined,
                      }}
                    >
                      {/* Lock icon top-right */}
                      {isLocked && (
                        <Lock
                          size={11}
                          className="absolute top-2.5 right-2.5"
                          style={{ color: "rgba(150,150,160,0.35)" }}
                        />
                      )}

                      {/* Status badge top-right */}
                      {!isLocked && (
                        <span
                          className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: s.textColor, backgroundColor: s.borderColor + "25" }}
                        >
                          {getStatusLabel(skill.currentStatus)}
                        </span>
                      )}

                      {/* Icon */}
                      <div className="mb-2.5">
                        <Icon size={20} style={{ color: s.iconColor }} />
                      </div>

                      {/* Name */}
                      <p
                        className="font-semibold text-sm leading-snug"
                        style={{ color: s.textColor }}
                      >
                        {skill.name}
                      </p>

                      {/* Active: mini stability bar + week */}
                      {isActive && skill.progress && (
                        <div className="mt-2.5">
                          <div className="h-1 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${skill.progress.stabilityScore * 100}%`,
                                backgroundColor: tc.color,
                              }}
                            />
                          </div>
                          <p className="text-[10px] mt-1" style={{ color: tc.color + "99" }}>
                            {t("skills.week")} {skill.progress.weekPhase}/3 ·{" "}
                            {(skill.progress.stabilityScore * 100).toFixed(0)}% {t("skills.stable").toLowerCase()}
                          </p>
                        </div>
                      )}

                      {/* Stable / mastered checkmark */}
                      {isStableOrMastered && (
                        <CheckCircle2
                          size={13}
                          className="mt-2"
                          style={{ color: s.textColor }}
                        />
                      )}

                      {/* Within-tier dependency hint for deadline-calibration */}
                      {skill.slug === "deadline-calibration" && (
                        <p
                          className="text-[10px] mt-1.5"
                          style={{ color: "rgba(150,150,160,0.45)" }}
                        >
                          {t("skills.needsPlanning")}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* SVG connector lines to next tier */}
              {connections && tier < 4 && (
                <svg
                  width="100%"
                  height="32"
                  className="block"
                  preserveAspectRatio="none"
                >
                  {connections.map(([from, to], i) => {
                    const xs = [25, 75];
                    return (
                      <line
                        key={i}
                        x1={`${xs[from]}%`}
                        y1="0"
                        x2={`${xs[to]}%`}
                        y2="32"
                        stroke={tc.color}
                        strokeWidth="1.5"
                        strokeOpacity="0.22"
                      />
                    );
                  })}
                </svg>
              )}

              {tier < 4 && !connections && <div className="h-8" />}
            </div>
          );
        })}
      </div>

      {/* Skill detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          {selected && (() => {
            const Icon = skillIconMap[selected.slug] ?? Target;
            const tc = tierConfig[selected.tier];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-foreground flex items-center gap-2">
                    <Icon size={18} style={{ color: tc.color }} />
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
                    <span className="capitalize text-foreground/80">{selected.currentStatus}</span>
                  </div>

                  {selected.progress && selected.currentStatus === "active" && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground/70">{t("skills.week")}</span>
                        <span className="text-foreground/80">{selected.progress.weekPhase}/3</span>
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
                          <Label className="text-foreground/80 text-sm">
                            {t("skills.defineTask")}
                          </Label>
                          <Input
                            value={userTask}
                            onChange={(e) => setUserTask(e.target.value)}
                            placeholder="e.g., At 8am at my desk, I will open my textbook"
                            className="bg-surface-inset border-border text-foreground"
                          />
                          <Button
                            onClick={() => handleSetTask(selected.id)}
                            disabled={loading || !userTask.trim()}
                            className="w-full text-black"
                            style={{ backgroundColor: tc.color }}
                          >
                            {loading ? t("skills.saving") : t("skills.setTask")}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {selected.currentStatus === "available" && canActivate && (
                    <Button
                      onClick={() => handleActivate(selected.id)}
                      disabled={loading}
                      className="w-full font-semibold text-black"
                      style={{ backgroundColor: tc.color }}
                    >
                      {loading ? t("skills.activating") : t("skills.activateSkill")}
                    </Button>
                  )}

                  {selected.currentStatus === "locked" && (
                    <div className="space-y-3">
                      {selected.prerequisites.length > 0 && (
                        <div className="bg-surface-inset rounded-lg p-3 space-y-2">
                          <p className="text-xs text-muted-foreground/70 font-medium">
                            {t("skills.requiredToUnlock")}
                          </p>
                          {selected.prerequisites.map((p) => (
                            <div key={p.slug} className="flex items-center gap-2 text-sm">
                              <span className={p.met ? "text-[#4ade80]" : "text-muted-foreground/50"}>
                                {p.met ? "✓" : "○"}
                              </span>
                              <span
                                className={
                                  p.met
                                    ? "text-foreground/80 line-through"
                                    : "text-muted-foreground/70"
                                }
                              >
                                {p.name}
                              </span>
                              {p.met && (
                                <span className="text-[#4ade80] text-xs">{t("skills.stable")}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-muted-foreground/60 text-xs text-center">
                        {t("skills.prerequisiteNote")}
                      </p>
                    </div>
                  )}

                  <Link
                    href={`/skills/${selected.slug}`}
                    className="block text-center text-muted-foreground hover:text-[#38bdf8] text-sm mt-2 transition-colors"
                  >
                    {t("skills.viewFullDetails")}
                  </Link>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
