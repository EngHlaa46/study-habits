"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Lock, CheckCircle2, Zap, Target } from "lucide-react";
import { useLanguage } from "@/lib/language";

const DIMENSION_LABELS: Record<string, string> = {
  planning:   "Planning & Prep",
  behavioral: "Behavioural",
  cognitive:  "Cognitive",
};

const LEVEL_NAMES: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Mastery",
};

interface SkillDetailProps {
  skill: {
    id: string;
    slug: string;
    name: string;
    level: number;
    dimension: string;
    description: string;
    purpose: string;
  };
  progress: {
    id: string;
    status: string;
    weekPhase: number;
    stabilityScore: number;
    userTask: string | null;
    weekPhaseStart: string | null;
    completionNarrative: string | null;
  } | null;
  checkIns: {
    date: string;
    initiated: boolean;
    focusLevel: string | null;
    atypical: boolean;
  }[];
}

export function SkillDetail({ skill, progress, checkIns }: SkillDetailProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [userTask, setUserTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState(progress?.completionNarrative ?? null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState("");

  const handleGenerateNarrative = async () => {
    if (!progress?.id) return;
    setNarrativeLoading(true);
    setNarrativeError("");
    try {
      const res = await fetch("/api/skills/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillProgressId: progress.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNarrativeError(t("skills.narrativeError"));
      } else {
        setNarrative(data.narrative);
      }
    } catch {
      setNarrativeError(t("skills.narrativeError"));
    } finally {
      setNarrativeLoading(false);
    }
  };

  const handleSetTask = async () => {
    if (!userTask.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: skill.id, action: "setTask", userTask }),
      });
      router.refresh();
      setUserTask("");
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    locked:    { label: t("skills.locked"),    color: "text-muted-foreground border-muted-foreground/30", icon: <Lock size={16} /> },
    available: { label: t("skills.available"), color: "text-muted-foreground border-border",              icon: <Target size={16} /> },
    active:    { label: t("skills.active"),    color: "text-primary border-primary",                      icon: <Zap size={16} /> },
    stable:    { label: t("skills.stable"),    color: "text-[#4ade80] border-[#4ade80]",                  icon: <CheckCircle2 size={16} /> },
    mastered:  { label: t("skills.mastered"),  color: "text-[#fbbf24] border-[#fbbf24]",                  icon: <CheckCircle2 size={16} /> },
  };

  const weekLabels: Record<number, string> = {
    1: t("skills.week1Short"),
    2: t("skills.week2Short"),
    3: t("skills.week3Short"),
  };

  const status = progress?.status || "locked";
  const config = statusConfig[status] || statusConfig.locked;

  const totalCheckIns = checkIns.length;
  const initiatedDays = checkIns.filter((c) => c.initiated).length;
  const focusedDays = checkIns.filter((c) => c.focusLevel === "focused" || c.focusLevel === "deep").length;

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Back link */}
      <motion.div variants={staggerItem}>
        <Link
          href="/skills"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          {t("skills.backToSkillTree")}
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{skill.name}</h1>
            <Badge variant="outline" className={config.color}>
              <span className="mr-1.5">{config.icon}</span>
              {config.label}
            </Badge>
          </div>
          <p className="text-muted-foreground/70 text-sm">
            Level {skill.level} · {LEVEL_NAMES[skill.level] ?? ""} &middot;{" "}
            {DIMENSION_LABELS[skill.dimension] ?? skill.dimension}
          </p>
        </div>
      </motion.div>

      {/* Description & Purpose */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">{t("skills.description")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{skill.description}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">{t("skills.whyThisSkill")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{skill.purpose}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active skill training section */}
      {status === "active" && progress && (
        <motion.div variants={staggerItem}>
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-primary text-lg">{t("skills.trainingProgress")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  Week {progress.weekPhase} — {weekLabels[progress.weekPhase] || "Not Started"}
                </span>
                <span className="text-muted-foreground/70">{progress.weekPhase}/3 {t("skills.week").toLowerCase()}s</span>
              </div>
              <Progress value={(progress.weekPhase / 3) * 100} className="h-2 bg-secondary" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-inset rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{totalCheckIns}</p>
                <p className="text-muted-foreground/70 text-xs mt-1">{t("skills.checkIns")}</p>
              </div>
              <div className="bg-surface-inset rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-primary">{initiatedDays}</p>
                <p className="text-muted-foreground/70 text-xs mt-1">{t("skills.daysStudied")}</p>
              </div>
              <div className="bg-surface-inset rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-[#4ade80]">
                  {(progress.stabilityScore * 100).toFixed(0)}%
                </p>
                <p className="text-muted-foreground/70 text-xs mt-1">{t("skills.stability")}</p>
              </div>
            </div>

            {checkIns.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground/70 mb-2">{t("skills.trainingTimeline")}</p>
                <div className="flex gap-1">
                  {checkIns.slice(-14).map((ci, i) => {
                    const focusColors: Record<string, string> = {
                      none: "bg-gray-600",
                      brief: "bg-yellow-500",
                      focused: "bg-[#38bdf8]",
                      deep: "bg-[#4ade80]",
                    };
                    const color = ci.initiated ? focusColors[ci.focusLevel || "none"] : "bg-gray-700";
                    return (
                      <div
                        key={i}
                        className={`flex-1 h-6 rounded ${color} ${ci.atypical ? "ring-1 ring-[#fbbf24]" : ""}`}
                        title={`${ci.date}: ${ci.initiated ? ci.focusLevel || "studied" : "did not study"}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {progress.userTask ? (
              <div className="bg-surface-inset rounded-lg p-4">
                <p className="text-xs text-muted-foreground/70 mb-1">{t("skills.yourTask")}</p>
                <p className="text-foreground/80 text-sm">{progress.userTask}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-foreground/80 text-sm">{t("skills.defineTask")}</Label>
                <Input
                  value={userTask}
                  onChange={(e) => setUserTask(e.target.value)}
                  placeholder={t("skills.taskPlaceholder") || "e.g., At 8am at my desk, I will open my textbook"}
                  className="bg-surface-inset border-border text-foreground"
                />
                <Button
                  onClick={handleSetTask}
                  disabled={loading || !userTask.trim()}
                  className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                >
                  {loading ? t("skills.saving") : t("skills.setTask")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Completed skill summary */}
      {(status === "stable" || status === "mastered") && progress && (
        <Card className="border-[#4ade80]/30">
          <CardContent className="pt-6">
            {narrative ? (
              <div className="bg-surface-inset rounded-lg p-4 mb-4 border border-[#4ade80]/20">
                <p className="text-foreground/80 text-sm leading-relaxed">{narrative}</p>
              </div>
            ) : (
              <div className="mb-4">
                <Button
                  variant="outline"
                  onClick={handleGenerateNarrative}
                  disabled={narrativeLoading}
                  className="w-full border-[#4ade80]/40 text-[#4ade80] hover:bg-[#4ade80]/10 text-sm"
                >
                  {narrativeLoading ? t("skills.narrativeGenerating") : t("skills.generateNarrative")}
                </Button>
                {narrativeError && <p className="text-red-400 text-xs mt-2">{narrativeError}</p>}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-inset rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-[#4ade80]">
                  {(progress.stabilityScore * 100).toFixed(0)}%
                </p>
                <p className="text-muted-foreground/70 text-xs mt-1">{t("skills.finalStability")}</p>
              </div>
              <div className="bg-surface-inset rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{totalCheckIns}</p>
                <p className="text-muted-foreground/70 text-xs mt-1">{t("skills.totalCheckIns")}</p>
              </div>
              <div className="bg-surface-inset rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-primary">{focusedDays}</p>
                <p className="text-muted-foreground/70 text-xs mt-1">{t("skills.focusedDays")}</p>
              </div>
            </div>
            {progress.userTask && (
              <div className="bg-surface-inset rounded-lg p-4 mt-4">
                <p className="text-xs text-muted-foreground/70 mb-1">{t("skills.taskUsed")}</p>
                <p className="text-foreground/80 text-sm">{progress.userTask}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Locked */}
      {status === "locked" && (
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-3">
          <Lock size={18} className="text-muted-foreground/60 shrink-0" />
          <p className="text-muted-foreground/70 text-sm">
            Complete all Level {skill.level - 1} skills to unlock Level {skill.level}.
          </p>
        </div>
      )}
    </motion.div>
  );
}
