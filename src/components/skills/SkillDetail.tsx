"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Lock, CheckCircle2, Zap, Target } from "lucide-react";
import { useLanguage } from "@/lib/language";

interface SkillDetailProps {
  skill: {
    id: string;
    slug: string;
    name: string;
    tier: number;
    description: string;
    purpose: string;
  };
  progress: {
    status: string;
    weekPhase: number;
    stabilityScore: number;
    userTask: string | null;
    weekPhaseStart: string | null;
  } | null;
  checkIns: {
    date: string;
    initiated: boolean;
    focusLevel: string | null;
    atypical: boolean;
  }[];
  prerequisites: { name: string; slug: string; met?: boolean }[];
  unlocksSkills: { name: string; slug: string }[];
  canActivate: boolean;
}

export function SkillDetail({
  skill,
  progress,
  checkIns,
  prerequisites,
  unlocksSkills,
  canActivate,
}: SkillDetailProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [userTask, setUserTask] = useState("");
  const [loading, setLoading] = useState(false);

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    locked: { label: t("skills.locked"), color: "text-muted-foreground border-muted-foreground/30", icon: <Lock size={16} /> },
    available: { label: t("skills.available"), color: "text-muted-foreground border-border", icon: <Target size={16} /> },
    active: { label: t("skills.active"), color: "text-[#38bdf8] border-[#38bdf8]", icon: <Zap size={16} /> },
    stable: { label: t("skills.stable"), color: "text-[#4ade80] border-[#4ade80]", icon: <CheckCircle2 size={16} /> },
    mastered: { label: t("skills.mastered"), color: "text-[#fbbf24] border-[#fbbf24]", icon: <CheckCircle2 size={16} /> },
  };

  const weekLabels: Record<number, string> = {
    1: t("skills.week1Short"),
    2: t("skills.week2Short"),
    3: t("skills.week3Short"),
  };

  const status = progress?.status || "locked";
  const config = statusConfig[status] || statusConfig.locked;

  const handleActivate = async () => {
    setLoading(true);
    try {
      await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: skill.id, action: "activate" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleSetTask = async () => {
    if (!userTask.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: skill.id,
          action: "setTask",
          userTask,
        }),
      });
      router.refresh();
      setUserTask("");
    } finally {
      setLoading(false);
    }
  };

  // Calculate training stats
  const totalCheckIns = checkIns.length;
  const initiatedDays = checkIns.filter((c) => c.initiated).length;
  const focusedDays = checkIns.filter(
    (c) => c.focusLevel === "focused" || c.focusLevel === "deep"
  ).length;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/skills"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        {t("skills.backToSkillTree")}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{skill.name}</h1>
            <Badge variant="outline" className={config.color}>
              <span className="mr-1.5">{config.icon}</span>
              {config.label}
            </Badge>
          </div>
          <p className="text-muted-foreground/70 text-sm">{t("skills.tier")} {skill.tier}</p>
        </div>
      </div>

      {/* Description & Purpose */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">{t("skills.description")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{skill.description}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">{t("skills.whyThisSkill")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{skill.purpose}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active skill training section */}
      {status === "active" && progress && (
        <Card className="bg-card border-[#38bdf8]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#38bdf8] text-lg">
              {t("skills.trainingProgress")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Week progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  Week {progress.weekPhase} —{" "}
                  {weekLabels[progress.weekPhase] || "Not Started"}
                </span>
                <span className="text-muted-foreground/70">
                  {progress.weekPhase}/3 {t("skills.week").toLowerCase()}s
                </span>
              </div>
              <Progress
                value={(progress.weekPhase / 3) * 100}
                className="h-2 bg-secondary"
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-inset rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{totalCheckIns}</p>
                <p className="text-muted-foreground/70 text-xs mt-1">{t("skills.checkIns")}</p>
              </div>
              <div className="bg-surface-inset rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-[#38bdf8]">
                  {initiatedDays}
                </p>
                <p className="text-muted-foreground/70 text-xs mt-1">{t("skills.daysStudied")}</p>
              </div>
              <div className="bg-surface-inset rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-[#4ade80]">
                  {(progress.stabilityScore * 100).toFixed(0)}%
                </p>
                <p className="text-muted-foreground/70 text-xs mt-1">{t("skills.stability")}</p>
              </div>
            </div>

            {/* Mini check-in timeline */}
            {checkIns.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground/70 mb-2">
                  {t("skills.trainingTimeline")}
                </p>
                <div className="flex gap-1">
                  {checkIns.slice(-14).map((ci, i) => {
                    const focusColors: Record<string, string> = {
                      none: "bg-gray-600",
                      brief: "bg-yellow-500",
                      focused: "bg-[#38bdf8]",
                      deep: "bg-[#4ade80]",
                    };
                    const color = ci.initiated
                      ? focusColors[ci.focusLevel || "none"]
                      : "bg-gray-700";
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

            {/* User task */}
            {progress.userTask ? (
              <div className="bg-surface-inset rounded-lg p-4">
                <p className="text-xs text-muted-foreground/70 mb-1">{t("skills.yourTask")}</p>
                <p className="text-foreground/80 text-sm">{progress.userTask}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-foreground/80 text-sm">
                  {t("skills.defineTask")}
                </Label>
                <Input
                  value={userTask}
                  onChange={(e) => setUserTask(e.target.value)}
                  placeholder={t("skills.taskPlaceholder") || "e.g., At 8am at my desk, I will open my textbook"}
                  className="bg-surface-inset border-border text-foreground"
                />
                <Button
                  onClick={handleSetTask}
                  disabled={loading || !userTask.trim()}
                  className="w-full bg-[#38bdf8] hover:bg-[#38bdf8]/80 text-black"
                >
                  {loading ? t("skills.saving") : t("skills.setTask")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed skill summary */}
      {(status === "stable" || status === "mastered") && progress && (
        <Card className="bg-card border-[#4ade80]/30">
          <CardContent className="pt-6">
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
                <p className="text-xl font-bold text-[#38bdf8]">
                  {focusedDays}
                </p>
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

      {/* Activation button */}
      {status === "available" && canActivate && (
        <Button
          onClick={handleActivate}
          disabled={loading}
          className="w-full bg-[#38bdf8] hover:bg-[#38bdf8]/80 text-black font-semibold py-6"
        >
          {loading ? t("skills.activating") : t("skills.activateSkill")}
        </Button>
      )}

      {status === "locked" && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-muted-foreground/60 shrink-0" />
            <p className="text-muted-foreground/80 text-sm font-medium">
              {t("skills.locked")}
            </p>
          </div>
          {prerequisites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
                {t("skills.completeFirst")}
              </p>
              {prerequisites.map((p) => (
                <Link
                  key={p.slug}
                  href={`/skills/${p.slug}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-inset hover:bg-secondary transition-colors"
                >
                  <span className={p.met ? "text-[#4ade80]" : "text-muted-foreground/40"}>
                    {p.met ? "✓" : "○"}
                  </span>
                  <span className={`text-sm ${p.met ? "text-foreground/60 line-through" : "text-muted-foreground"}`}>
                    {p.name}
                  </span>
                  {p.met ? (
                    <span className="ml-auto text-xs text-[#4ade80]">{t("skills.stable")}</span>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground/50">→</span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground/50 leading-relaxed">
            {t("skills.prerequisiteNote")}
          </p>
        </div>
      )}

      {/* Dependencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {prerequisites.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm">{t("skills.requires")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {prerequisites.map((p) => (
                <Link
                  key={p.slug}
                  href={`/skills/${p.slug}`}
                  className="block text-muted-foreground hover:text-[#38bdf8] text-sm transition-colors"
                >
                  {p.name}
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
        {unlocksSkills.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm">{t("skills.unlocks")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unlocksSkills.map((s) => (
                <Link
                  key={s.slug}
                  href={`/skills/${s.slug}`}
                  className="block text-muted-foreground hover:text-[#38bdf8] text-sm transition-colors"
                >
                  {s.name}
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
