"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, ChevronDown, ChevronRight, Lock, CircleDot, CheckCircle2, Loader2, BookOpen, X, Dumbbell, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssessmentPanel } from "./AssessmentPanel";

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
}

interface SkillTree {
  id: string;
  materialName: string;
  generatedAt: string;
  nodes: SkillNode[];
}

interface MaterialsClientProps {
  initialSkillTrees: SkillTree[];
}

const STATUS_CONFIG = {
  locked: { icon: Lock, color: "text-muted-foreground/40", bg: "bg-muted/30", label: "Locked" },
  active: { icon: CircleDot, color: "text-primary", bg: "bg-primary/10", label: "Active" },
  developing: { icon: CircleDot, color: "text-amber-400", bg: "bg-amber-400/10", label: "Developing" },
  mastered: { icon: CheckCircle2, color: "text-accent", bg: "bg-accent/10", label: "Mastered" },
  maintenance: { icon: CheckCircle2, color: "text-accent/60", bg: "bg-accent/5", label: "Maintenance" },
};

const FORMAT_LABELS: Record<string, string> = {
  recall_quiz: "Recall Quiz",
  matching_game: "Matching Game",
  problem_solving: "Problem Solving",
  code_debugging: "Code Debugging",
  explanation_prompt: "Explanation",
  analogy_task: "Analogy Task",
  creative_challenge: "Creative Challenge",
};

function NodeCard({ node, onPractice }: { node: SkillNode; onPractice: (id: string, name: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState(node.masteryStatus);
  const [localScore, setLocalScore] = useState(node.masteryScore);
  useEffect(() => { setLocalStatus(node.masteryStatus); setLocalScore(node.masteryScore); }, [node.masteryStatus, node.masteryScore]);
  const prereqs = JSON.parse(node.prerequisites) as string[];
  const config = STATUS_CONFIG[localStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.locked;
  const Icon = config.icon;
  const canPractice = localStatus !== "locked";

  return (
    <div className={`rounded-xl border border-border ${config.bg} transition-all`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Icon size={16} className={config.color} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">{FORMAT_LABELS[node.suggestedEvalFormat] ?? node.suggestedEvalFormat}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {localScore > 0 && (
            <span className="text-xs font-medium text-primary">{Math.round(localScore * 100)}%</span>
          )}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>
            {config.label}
          </span>
          {expanded ? <ChevronDown size={14} className="text-muted-foreground/50" /> : <ChevronRight size={14} className="text-muted-foreground/50" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          <p className="text-xs text-muted-foreground/80 leading-relaxed">{node.description}</p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
            <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-1">Mastery looks like</p>
            <p className="text-xs text-foreground/80 leading-relaxed">{node.whatMasteryLooksLike}</p>
          </div>
          {prereqs.length > 0 && (
            <p className="text-xs text-muted-foreground/50">
              Requires: <span className="text-muted-foreground/70">{prereqs.join(", ")}</span>
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
      )}
    </div>
  );
}

function SkillTreeView({ tree, onPractice, onQuiz }: { tree: SkillTree; onPractice: (id: string, name: string) => void; onQuiz: (treeId: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const activeCount = tree.nodes.filter((n) => n.masteryStatus === "active" || n.masteryStatus === "developing").length;
  const masteredCount = tree.nodes.filter((n) => n.masteryStatus === "mastered" || n.masteryStatus === "maintenance").length;

  return (
    <div className="glass-card glass-panel p-5 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <BookOpen size={18} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{tree.materialName}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {tree.nodes.length} skills · {activeCount} active · {masteredCount} mastered
            </p>
          </div>
          {expanded ? <ChevronDown size={16} className="text-muted-foreground/50" /> : <ChevronRight size={16} className="text-muted-foreground/50" />}
        </button>
        {tree.nodes.length > 0 && (
          <button
            onClick={() => onQuiz(tree.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-[#a855f7]/30 text-[#a855f7] text-xs font-semibold transition-all hover:scale-105 shrink-0"
            title="Quiz this material"
          >
            <Zap size={12} />
            Quiz
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-2">
          {tree.nodes.map((node) => (
            <NodeCard key={node.id} node={node} onPractice={onPractice} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MaterialsClient({ initialSkillTrees }: MaterialsClientProps) {
  const router = useRouter();
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>(initialSkillTrees);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assessingNode, setAssessingNode] = useState<{ id: string; name: string } | null>(null);

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
      setSkillTrees((prev) => [data.skillTree as SkillTree, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Materials</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Upload your course material and AI will build a personalized skill tree for mastery.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`glass-card glass-panel mb-6 flex flex-col items-center justify-center gap-3 p-10 cursor-pointer transition-all border-2 ${
          dragOver ? "border-primary/60 bg-primary/5" : "border-dashed border-border"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          style={{ display: "none" }}
          onChange={onFileChange}
        />
        {uploading ? (
          <>
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing material and building skill tree…</p>
            <p className="text-xs text-muted-foreground/50">This takes about 20–40 seconds</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload size={22} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Drop your material here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PDF, TXT, or Markdown · up to 10 MB</p>
            </div>
            <Button variant="outline" size="sm" className="mt-1">
              <FileText size={14} className="mr-1.5" />
              Browse file
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          <X size={14} />
          {error}
        </div>
      )}

      {/* Skill trees list */}
      {skillTrees.length === 0 && !uploading ? (
        <div className="text-center text-muted-foreground/50 text-sm py-12">
          No materials yet — upload your first one above.
        </div>
      ) : (
        skillTrees.map((tree) => (
          <SkillTreeView
            key={tree.id}
            tree={tree}
            onPractice={(id, name) => setAssessingNode({ id, name })}
            onQuiz={(treeId) => router.push(`/games/quiz?skillTreeId=${treeId}`)}
          />
        ))
      )}

      {assessingNode && (
        <AssessmentPanel
          nodeId={assessingNode.id}
          nodeName={assessingNode.name}
          onClose={() => setAssessingNode(null)}
          onComplete={(newScore, newStatus) => {
            setSkillTrees((prev) =>
              prev.map((tree) => ({
                ...tree,
                nodes: tree.nodes.map((n) =>
                  n.id === assessingNode.id ? { ...n, masteryScore: newScore, masteryStatus: newStatus } : n
                ),
              }))
            );
            setAssessingNode(null);
          }}
        />
      )}
    </div>
  );
}
