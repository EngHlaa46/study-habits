"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Lock, Zap, CheckCircle2, RotateCcw, Clock, BookOpen, Plus } from "lucide-react";
import Link from "next/link";

interface SkillNode {
  id: string;
  localId: string;
  name: string;
  description: string;
  whatMasteryLooksLike: string;
  suggestedEvalFormat: string;
  masteryStatus: string;
  masteryScore: number;
  nextReviewAt: string | null;
  lastPracticedAt: string | null;
  prerequisites: string;
}

interface SkillTreeSummary {
  id: string;
  materialName: string;
  generatedAt: string;
  nodes: SkillNode[];
}

interface Props {
  skillTrees: SkillTreeSummary[];
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:      { label: "Active",       color: "text-sky-400 border-sky-400/30 bg-sky-400/10",      icon: <Zap size={11} /> },
  developing:  { label: "Developing",   color: "text-amber-400 border-amber-400/30 bg-amber-400/10", icon: <Zap size={11} /> },
  mastered:    { label: "Mastered",     color: "text-green-400 border-green-400/30 bg-green-400/10", icon: <CheckCircle2 size={11} /> },
  maintenance: { label: "Maintenance",  color: "text-purple-400 border-purple-400/30 bg-purple-400/10", icon: <RotateCcw size={11} /> },
  locked:      { label: "Locked",       color: "text-muted-foreground border-border bg-secondary",   icon: <Lock size={11} /> },
};

const FORMAT_LABELS: Record<string, string> = {
  recall_quiz: "Recall quiz",
  matching_game: "Matching",
  problem_solving: "Problem solving",
  code_debugging: "Debugging",
  explanation_prompt: "Explanation",
  analogy_task: "Analogy",
  creative_challenge: "Creative",
};

function NodeCard({ node, now }: { node: SkillNode; now: Date }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[node.masteryStatus] ?? STATUS_META.locked;
  const isDue = node.nextReviewAt != null && new Date(node.nextReviewAt) <= now;
  const isLocked = node.masteryStatus === "locked";
  const isPracticable = node.masteryStatus === "active" || node.masteryStatus === "developing" || node.masteryStatus === "maintenance";

  return (
    <Card className={`transition-all ${isLocked ? "opacity-50" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm">{node.name}</h3>
              {isDue && !isLocked && (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                  <Clock size={10} />
                  Due
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{node.description}</p>
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.color}`}>
            {meta.icon}
            {meta.label}
          </span>
        </div>

        {/* Mastery bar */}
        {!isLocked && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground/60">
              <span>Mastery</span>
              <span>{Math.round(node.masteryScore * 100)}%</span>
            </div>
            <Progress value={node.masteryScore * 100} className="h-1.5" />
          </div>
        )}

        {/* Expandable mastery description */}
        {expanded && !isLocked && (
          <div className="text-xs text-muted-foreground/70 bg-secondary/40 rounded p-2 space-y-1">
            <p className="font-medium text-foreground/60">Mastery looks like:</p>
            <p>{node.whatMasteryLooksLike}</p>
            <p className="text-muted-foreground/50 mt-1">
              Format: {FORMAT_LABELS[node.suggestedEvalFormat] ?? node.suggestedEvalFormat}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted-foreground/50 hover:text-foreground/70 transition-colors"
          >
            {expanded ? "Less" : "Details"}
          </button>
          {isPracticable && (
            <Link href={`/dashboard`}>
              <Button size="sm" variant={isDue ? "default" : "outline"} className="h-7 text-xs px-3">
                Practice
              </Button>
            </Link>
          )}
          {isLocked && (
            <span className="text-xs text-muted-foreground/40 flex items-center gap-1">
              <Lock size={10} /> Unlock prerequisites first
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SkillTreeView({ skillTrees }: Props) {
  const [activeTreeId, setActiveTreeId] = useState(skillTrees[0]?.id ?? "");
  const now = new Date();

  const tree = skillTrees.find((t) => t.id === activeTreeId) ?? skillTrees[0];
  if (!tree) return null;

  const sections = [
    {
      key: "due",
      label: "Due for Review",
      accent: "text-amber-400",
      nodes: tree.nodes.filter(
        (n) => (n.masteryStatus === "active" || n.masteryStatus === "developing" || n.masteryStatus === "maintenance")
          && n.nextReviewAt != null && new Date(n.nextReviewAt) <= now
      ),
    },
    {
      key: "active",
      label: "In Progress",
      accent: "text-sky-400",
      nodes: tree.nodes.filter(
        (n) => (n.masteryStatus === "active" || n.masteryStatus === "developing")
          && !(n.nextReviewAt != null && new Date(n.nextReviewAt) <= now)
      ),
    },
    {
      key: "mastered",
      label: "Mastered",
      accent: "text-green-400",
      nodes: tree.nodes.filter((n) => n.masteryStatus === "mastered" || n.masteryStatus === "maintenance"),
    },
    {
      key: "locked",
      label: "Locked",
      accent: "text-muted-foreground/50",
      nodes: tree.nodes.filter((n) => n.masteryStatus === "locked"),
    },
  ].filter((s) => s.nodes.length > 0);

  const totalNodes = tree.nodes.length;
  const masteredCount = tree.nodes.filter((n) => n.masteryStatus === "mastered" || n.masteryStatus === "maintenance").length;
  const progressPct = totalNodes > 0 ? Math.round((masteredCount / totalNodes) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Tree selector */}
      {skillTrees.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {skillTrees.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTreeId(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                t.id === activeTreeId
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <BookOpen size={13} />
              {t.materialName}
            </button>
          ))}
          <Link href="/onboarding?returning=true">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-border text-muted-foreground/60 hover:text-foreground/70 hover:border-muted-foreground/40 transition-colors">
              <Plus size={13} />
              Add subject
            </button>
          </Link>
        </div>
      )}

      {/* Tree overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-foreground text-lg">{tree.materialName}</CardTitle>
              <p className="text-sm text-muted-foreground/60 mt-0.5">
                {totalNodes} nodes · {masteredCount} mastered
              </p>
            </div>
            {skillTrees.length === 1 && (
              <Link href="/onboarding?returning=true">
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <Plus size={12} /> Add subject
                </Button>
              </Link>
            )}
          </div>
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-xs text-muted-foreground/60">
              <span>Overall progress</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Node sections */}
      {sections.map((section) => (
        <div key={section.key} className="space-y-3">
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${section.accent}`}>
            {section.label} <span className="text-muted-foreground/40 font-normal normal-case tracking-normal">({section.nodes.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.nodes.map((node) => (
              <NodeCard key={node.id} node={node} now={now} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
