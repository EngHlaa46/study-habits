"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, ChevronDown, ChevronRight, Lock, CircleDot,
  CheckCircle2, Loader2, X, Dumbbell, Zap, Plus,
  TrendingUp, Target, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssessmentPanel } from "@/components/materials/AssessmentPanel";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface SkillNode {
  id: string;
  localId: string;
  name: string;
  description: string;
  whatMasteryLooksLike: string;
  prerequisites: string;
  suggestedEvalFormat: string;
  masteryStatus: string;
  masteryScore: number;
  nextReviewAt: string | null;
  lastPracticedAt: string | null;
}

interface SkillTree {
  id: string;
  materialName: string;
  generatedAt: string;
  nodes: SkillNode[];
}

const STATUS_CONFIG = {
  locked:      { icon: Lock,         color: "text-muted-foreground/40", bg: "bg-muted/20",      label: "Locked",      border: "border-border/30" },
  active:      { icon: CircleDot,    color: "text-sky-400",             bg: "bg-sky-400/[0.07]", label: "Active",     border: "border-sky-400/20" },
  developing:  { icon: CircleDot,    color: "text-amber-400",           bg: "bg-amber-400/[0.07]", label: "Developing", border: "border-amber-400/20" },
  mastered:    { icon: CheckCircle2, color: "text-green-400",           bg: "bg-green-400/[0.07]", label: "Mastered",  border: "border-green-400/20" },
  maintenance: { icon: CheckCircle2, color: "text-green-400/70",        bg: "bg-green-400/[0.04]", label: "Maintenance", border: "border-green-400/15" },
};

const FORMAT_LABELS: Record<string, string> = {
  recall_quiz:        "Recall Quiz",
  matching_game:      "Matching",
  problem_solving:    "Problem Solving",
  code_debugging:     "Debugging",
  explanation_prompt: "Explanation",
  analogy_task:       "Analogy",
  creative_challenge: "Creative",
};

function NodeCard({
  node,
  onPractice,
  isWeakness = false,
}: {
  node: SkillNode;
  onPractice: (id: string, name: string) => void;
  isWeakness?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState(node.masteryStatus);
  const [localScore, setLocalScore] = useState(node.masteryScore);
  const prereqs = (() => { try { return JSON.parse(node.prerequisites) as string[]; } catch { return []; } })();
  const config = STATUS_CONFIG[localStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.locked;
  const Icon = config.icon;
  const canPractice = localStatus !== "locked";
  const now = new Date();
  const isDue = node.nextReviewAt != null && new Date(node.nextReviewAt) <= now;

  // expose local state updater so parent can call it via ref trick — simpler to just recreate from parent
  void setLocalStatus; void setLocalScore;

  return (
    <motion.div
      layout
      className={`rounded-xl border overflow-hidden ${isWeakness ? "border-red-400/30 bg-red-400/[0.05]" : `${config.border} ${config.bg}`}`}
      whileHover={canPractice ? { scale: 1.015, transition: { type: "spring", stiffness: 400, damping: 28 } } : {}}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Icon size={15} className={`${config.color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
            {isDue && localStatus !== "locked" && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold shrink-0">
                <Clock size={9} /> Due
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground/50 mt-0.5">
            {FORMAT_LABELS[node.suggestedEvalFormat] ?? node.suggestedEvalFormat}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {localScore > 0 && (
            <span className="text-xs font-semibold text-primary">{Math.round(localScore * 100)}%</span>
          )}
          {expanded
            ? <ChevronDown size={13} className="text-muted-foreground/50" />
            : <ChevronRight size={13} className="text-muted-foreground/50" />
          }
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/40">
              {localStatus !== "locked" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground/50">
                    <span>Mastery</span>
                    <span>{Math.round(localScore * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${localScore * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground/80 leading-relaxed">{node.description}</p>
              <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
                <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-1">
                  Mastery looks like
                </p>
                <p className="text-xs text-foreground/80 leading-relaxed">{node.whatMasteryLooksLike}</p>
              </div>
              {prereqs.length > 0 && (
                <p className="text-xs text-muted-foreground/50">
                  Requires:{" "}
                  <span className="text-muted-foreground/70">{prereqs.join(", ")}</span>
                </p>
              )}
              {canPractice && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPractice(node.id, node.name); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-semibold transition-colors"
                >
                  <Dumbbell size={12} />
                  Practice
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InsightsPanel({ tree }: { tree: SkillTree }) {
  const now = new Date();
  const totalNodes = tree.nodes.length;
  const masteredNodes = tree.nodes.filter(
    (n) => n.masteryStatus === "mastered" || n.masteryStatus === "maintenance"
  );
  const inProgressNodes = tree.nodes.filter(
    (n) => n.masteryStatus === "active" || n.masteryStatus === "developing"
  );
  const dueNodes = tree.nodes.filter(
    (n) =>
      (n.masteryStatus === "active" ||
        n.masteryStatus === "developing" ||
        n.masteryStatus === "maintenance") &&
      n.nextReviewAt != null &&
      new Date(n.nextReviewAt) <= now
  );
  const progressPct =
    totalNodes > 0 ? Math.round((masteredNodes.length / totalNodes) * 100) : 0;

  const strengths = tree.nodes
    .filter((n) => n.masteryStatus !== "locked" && n.masteryScore >= 0.65)
    .sort((a, b) => b.masteryScore - a.masteryScore)
    .slice(0, 4);

  const weaknesses = tree.nodes
    .filter(
      (n) =>
        (n.masteryStatus === "active" || n.masteryStatus === "developing") &&
        n.masteryScore < 0.45
    )
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 4);

  const allPristine = inProgressNodes.every((n) => n.masteryScore === 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 28, delay: 0.12 }}
      className="space-y-4"
    >
      {/* Overview */}
      <div className="glass-card glass-panel p-4 space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Overview
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/70">Mastery progress</span>
            <span className="font-semibold text-foreground">{progressPct}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#4ade80]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-secondary/40">
            <p className="text-base font-bold text-foreground">{totalNodes}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Total</p>
          </div>
          <div className="p-2 rounded-lg bg-sky-400/10">
            <p className="text-base font-bold text-sky-400">{inProgressNodes.length}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Active</p>
          </div>
          <div className="p-2 rounded-lg bg-green-400/10">
            <p className="text-base font-bold text-green-400">{masteredNodes.length}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Mastered</p>
          </div>
        </div>
        {dueNodes.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/20">
            <Clock size={12} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-400 font-medium">
              {dueNodes.length} node{dueNodes.length > 1 ? "s" : ""} due for review
            </p>
          </div>
        )}
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="glass-card glass-panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-green-400" />
            <p className="text-[10px] font-semibold text-green-400 uppercase tracking-widest">
              Strengths
            </p>
          </div>
          <div className="space-y-2">
            {strengths.map((node, i) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="flex items-center justify-between gap-2"
              >
                <p className="text-xs text-foreground/80 flex-1 truncate">{node.name}</p>
                <span className="text-xs font-semibold text-green-400 shrink-0">
                  {Math.round(node.masteryScore * 100)}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Focus areas / weaknesses */}
      {weaknesses.length > 0 && (
        <div className="glass-card glass-panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target size={13} className="text-amber-400" />
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">
              Focus Areas
            </p>
          </div>
          <div className="space-y-2">
            {weaknesses.map((node, i) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                className="flex items-center justify-between gap-2"
              >
                <p className="text-xs text-foreground/80 flex-1 truncate">{node.name}</p>
                <span className="text-xs font-semibold text-amber-400 shrink-0">
                  {Math.round(node.masteryScore * 100)}%
                </span>
              </motion.div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
            Practice these to raise your mastery score.
          </p>
        </div>
      )}

      {/* Pristine / no data state */}
      {strengths.length === 0 && weaknesses.length === 0 && (
        <div className="glass-card glass-panel p-4 text-center space-y-2">
          <Target size={20} className="text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground/50">
            {allPristine && inProgressNodes.length > 0
              ? "Practice some nodes to see your strengths and focus areas here."
              : "No insights yet — start practicing to track your progress."}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export function SkillTreeClient({
  initialSkillTrees,
}: {
  initialSkillTrees: SkillTree[];
}) {
  const router = useRouter();
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>(initialSkillTrees);
  const [activeTreeId, setActiveTreeId] = useState(initialSkillTrees[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadExpanded, setUploadExpanded] = useState(initialSkillTrees.length === 0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assessingNode, setAssessingNode] = useState<{ id: string; name: string } | null>(null);

  const activeTree = skillTrees.find((t) => t.id === activeTreeId) ?? skillTrees[0];
  const now = new Date();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name.replace(/\.[^.]+$/, ""));
    try {
      const res = await fetch("/api/materials", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const newTree = data.skillTree as SkillTree;
      setSkillTrees((prev) => [newTree, ...prev]);
      setActiveTreeId(newTree.id);
      setUploadExpanded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const handleNodeComplete = useCallback(
    (nodeId: string, newScore: number, newStatus: string) => {
      setSkillTrees((prev) =>
        prev.map((tree) => ({
          ...tree,
          nodes: tree.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, masteryScore: newScore, masteryStatus: newStatus }
              : n
          ),
        }))
      );
    },
    []
  );

  const WEAKNESS_THRESHOLD = 0.4;

  const sections: { key: string; label: string; accent: string; description?: string; nodes: SkillNode[] }[] = activeTree
    ? [
        {
          key: "due",
          label: "Due for Review",
          accent: "text-amber-400",
          nodes: activeTree.nodes.filter(
            (n) =>
              (n.masteryStatus === "active" ||
                n.masteryStatus === "developing" ||
                n.masteryStatus === "maintenance") &&
              n.nextReviewAt != null &&
              new Date(n.nextReviewAt) <= now
          ),
        },
        {
          key: "weaknesses",
          label: "Weaknesses",
          accent: "text-red-400",
          description: "These topics need the most attention — mastery is low.",
          nodes: activeTree.nodes.filter(
            (n) =>
              (n.masteryStatus === "active" || n.masteryStatus === "developing") &&
              n.masteryScore < WEAKNESS_THRESHOLD &&
              !(n.nextReviewAt != null && new Date(n.nextReviewAt) <= now)
          ),
        },
        {
          key: "active",
          label: "In Progress",
          accent: "text-sky-400",
          nodes: activeTree.nodes.filter(
            (n) =>
              (n.masteryStatus === "active" || n.masteryStatus === "developing") &&
              n.masteryScore >= WEAKNESS_THRESHOLD &&
              !(n.nextReviewAt != null && new Date(n.nextReviewAt) <= now)
          ),
        },
        {
          key: "mastered",
          label: "Mastered",
          accent: "text-green-400",
          nodes: activeTree.nodes.filter(
            (n) => n.masteryStatus === "mastered" || n.masteryStatus === "maintenance"
          ),
        },
        {
          key: "locked",
          label: "Locked",
          accent: "text-muted-foreground/50",
          nodes: activeTree.nodes.filter((n) => n.masteryStatus === "locked"),
        },
      ].filter((s) => s.nodes.length > 0)
    : [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Skill Tree</h1>
          <p className="text-muted-foreground/70 mt-1 text-sm">
            Your personalized mastery map — built from your course material
          </p>
        </div>
        {skillTrees.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadExpanded((v) => !v)}
            className="shrink-0 gap-1.5"
          >
            <Plus size={14} />
            Add subject
          </Button>
        )}
      </div>

      {/* Upload zone — full when empty, collapsible otherwise */}
      <AnimatePresence>
        {(uploadExpanded || skillTrees.length === 0) && (
          <motion.div
            key="upload"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="overflow-hidden mb-6"
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleUpload(file);
              }}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`glass-card glass-panel flex flex-col items-center justify-center gap-3 p-10 cursor-pointer transition-all border-2 ${
                dragOver
                  ? "border-primary/60 bg-primary/5"
                  : "border-dashed border-border"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = "";
                }}
              />
              {uploading ? (
                <>
                  <Loader2 size={32} className="text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Analyzing material and building skill tree…
                  </p>
                  <p className="text-xs text-muted-foreground/50">
                    This takes about 20–40 seconds
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload size={22} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Drop your material here
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      PDF, TXT, or Markdown · up to 10 MB
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-1 pointer-events-none">
                    <FileText size={14} className="mr-1.5" />
                    Browse file
                  </Button>
                </>
              )}
            </div>
            {error && (
              <div className="flex items-center gap-2 mt-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                <X size={14} />
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tree selector pills */}
      {skillTrees.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {skillTrees.map((t) => (
            <motion.button
              key={t.id}
              onClick={() => setActiveTreeId(t.id)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className={`relative px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                t.id === activeTreeId
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground/60"
              }`}
            >
              {t.id === activeTreeId && (
                <motion.span
                  layoutId="tree-pill"
                  className="absolute inset-0 rounded-full bg-primary/10 border border-primary/40"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t.materialName}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Main layout: nodes + insights */}
      {activeTree && (
        <div className="lg:grid lg:grid-cols-[1fr_272px] gap-6">
          {/* Nodes */}
          <motion.div
            key={activeTreeId}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-6 min-w-0"
          >
            {sections.length === 0 ? (
              <p className="text-center text-muted-foreground/50 text-sm py-12">
                No nodes loaded yet.
              </p>
            ) : (
              sections.map((section) => (
                <motion.div key={section.key} variants={staggerItem} className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className={`text-[11px] font-semibold uppercase tracking-widest ${section.accent}`}>
                      {section.label}
                    </h2>
                    <span className="text-xs text-muted-foreground/30">
                      ({section.nodes.length})
                    </span>
                    {"description" in section && section.description && (
                      <span className="text-[11px] text-muted-foreground/50 normal-case tracking-normal">
                        — {section.description}
                      </span>
                    )}
                  </div>
                  {section.key === "weaknesses" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-400/[0.07] border border-red-400/20 text-xs text-red-400/80">
                      Focus on these first — they&apos;re dragging your overall mastery down.
                    </div>
                  )}
                  <motion.div
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.05 } },
                    }}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {section.nodes.map((node) => (
                      <motion.div
                        key={node.id}
                        variants={{
                          hidden: { opacity: 0, y: 12 },
                          show: {
                            opacity: 1,
                            y: 0,
                            transition: { type: "spring", stiffness: 380, damping: 26 },
                          },
                        }}
                      >
                        <NodeCard
                          node={node}
                          onPractice={(id, name) => setAssessingNode({ id, name })}
                          isWeakness={section.key === "weaknesses"}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              ))
            )}

            {/* Quiz CTA */}
            {activeTree.nodes.length > 0 && (
              <motion.div variants={staggerItem}>
                <button
                  onClick={() => router.push(`/games/quiz?skillTreeId=${activeTree.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/[0.07] text-[#a855f7] text-sm font-semibold hover:bg-[#a855f7]/[0.14] transition-colors"
                >
                  <Zap size={15} />
                  Quiz this material
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Insights panel */}
          <InsightsPanel key={`insights-${activeTreeId}`} tree={activeTree} />
        </div>
      )}

      {/* Practice modal */}
      {assessingNode && (
        <AssessmentPanel
          nodeId={assessingNode.id}
          nodeName={assessingNode.name}
          onClose={() => setAssessingNode(null)}
          onComplete={(newScore, newStatus) => {
            handleNodeComplete(assessingNode.id, newScore, newStatus);
            setAssessingNode(null);
          }}
        />
      )}
    </div>
  );
}
