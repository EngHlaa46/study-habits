"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedActivity } from "@/lib/ai/dcs/generationAgent";

interface AssessmentResult {
  overallScore: number;
  masteryDelta: number;
  calibrationAccuracy: number;
  strengths: string;
  weaknesses: string;
  aiNotes: string;
  newMasteryScore: number;
  newMasteryStatus: string;
}

interface AssessmentPanelProps {
  nodeId: string;
  nodeName: string;
  onClose: () => void;
  onComplete: (newScore: number, newStatus: string) => void;
}

const FORMAT_ICONS: Record<string, string> = {
  recall_quiz: "Q",
  matching_game: "M",
  problem_solving: "P",
  code_debugging: "C",
  explanation_prompt: "E",
  analogy_task: "A",
  creative_challenge: "✦",
};

export function AssessmentPanel({ nodeId, nodeName, onClose, onComplete }: AssessmentPanelProps) {
  const [phase, setPhase] = useState<"loading" | "confidence" | "answering" | "submitting" | "result">("loading");
  const [activity, setActivity] = useState<GeneratedActivity | null>(null);
  const [confidence, setConfidence] = useState<number>(3);
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load activity on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/assessment/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setActivity(data.activity as GeneratedActivity);
        setPhase("confidence");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load activity");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const handleSubmit = async () => {
    if (!activity || !response.trim()) return;
    setPhase("submitting");
    try {
      const res = await fetch("/api/assessment/submit-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, activity, studentResponse: response, confidenceLevel: confidence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ ...data.result, newMasteryScore: data.newMasteryScore, newMasteryStatus: data.newMasteryStatus });
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setPhase("answering");
    }
  };

  const confidenceLabels = ["", "Not sure", "Somewhat sure", "Fairly sure", "Confident", "Very confident"];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg glass-card glass-panel flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wide">Practice</p>
            <p className="text-sm font-semibold text-foreground truncate">{nodeName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground/50 hover:text-muted-foreground ml-3 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Loading */}
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground/60">Generating your practice activity…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Activity display */}
          {activity && (phase === "confidence" || phase === "answering" || phase === "submitting") && (
            <>
              {/* Activity badge */}
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {FORMAT_ICONS[activity.format] ?? "?"}
                </span>
                <span className="text-xs text-muted-foreground/60">{activity.title}</span>
              </div>

              {/* Instruction */}
              <p className="text-sm text-muted-foreground/80 italic">{activity.instruction}</p>

              {/* Activity content */}
              {activity.prompt && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-4">
                  <p className="text-sm text-foreground leading-relaxed">{activity.prompt}</p>
                </div>
              )}

              {activity.questions && (
                <div className="space-y-2">
                  {activity.questions.map((q, i) => (
                    <div key={i} className="rounded-lg bg-card border border-border px-4 py-3">
                      <p className="text-xs text-muted-foreground/60 mb-1">Q{i + 1}</p>
                      <p className="text-sm text-foreground">{q}</p>
                    </div>
                  ))}
                </div>
              )}

              {activity.pairs && (
                <div className="space-y-2">
                  {activity.pairs.map((pair, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground">{pair.term}</div>
                      <div className="flex-1 rounded-lg bg-secondary/50 border border-border px-3 py-2 text-sm text-muted-foreground">{pair.match}</div>
                    </div>
                  ))}
                </div>
              )}

              {activity.code && (
                <pre className="rounded-xl bg-zinc-950 text-emerald-400 text-xs p-4 overflow-x-auto border border-border leading-relaxed">
                  {activity.code}
                </pre>
              )}

              {/* Confidence selector — shown before answering */}
              {phase === "confidence" && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-foreground">Before you answer — how confident are you?</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setConfidence(v)}
                        className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                          confidence === v
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground/60 hover:border-muted-foreground"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground/50">{confidenceLabels[confidence]}</p>
                  <Button
                    onClick={() => setPhase("answering")}
                    className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                  >
                    Start answering <ChevronRight size={14} className="ml-1" />
                  </Button>
                </div>
              )}

              {/* Response textarea — shown when answering */}
              {(phase === "answering" || phase === "submitting") && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Your answer</label>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write your answer here…"
                    className="bg-card border-border text-foreground resize-none"
                    rows={5}
                    disabled={phase === "submitting"}
                  />
                </div>
              )}
            </>
          )}

          {/* Result */}
          {phase === "result" && result && (
            <div className="space-y-4">
              {/* Score */}
              <div className="text-center py-4">
                <div className={`inline-flex items-center gap-2 text-2xl font-bold ${
                  result.overallScore >= 0.7 ? "text-accent" : result.overallScore >= 0.4 ? "text-amber-400" : "text-destructive"
                }`}>
                  <CheckCircle2 size={24} />
                  {Math.round(result.overallScore * 100)}%
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Mastery: {Math.round(result.newMasteryScore * 100)}% · {result.newMasteryStatus}
                </p>
              </div>

              {/* Feedback */}
              <div className="rounded-xl bg-accent/10 border border-accent/20 px-4 py-4 space-y-2">
                <p className="text-xs font-semibold text-accent/80 uppercase tracking-wide">Feedback</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{result.aiNotes}</p>
              </div>

              {result.strengths && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide">Strengths</p>
                  <p className="text-sm text-foreground/80">{result.strengths}</p>
                </div>
              )}

              {result.weaknesses && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide">Areas to work on</p>
                  <p className="text-sm text-foreground/80">{result.weaknesses}</p>
                </div>
              )}

              <div className="text-xs text-center text-muted-foreground/40">
                Calibration accuracy: {Math.round(result.calibrationAccuracy * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border">
          {phase === "answering" && (
            <Button
              onClick={handleSubmit}
              disabled={!response.trim()}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold"
            >
              Submit answer
            </Button>
          )}
          {phase === "submitting" && (
            <Button disabled className="w-full">
              <Loader2 size={16} className="animate-spin mr-2" /> Analysing…
            </Button>
          )}
          {phase === "result" && result && (
            <Button
              onClick={() => { onComplete(result.newMasteryScore, result.newMasteryStatus); onClose(); }}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
