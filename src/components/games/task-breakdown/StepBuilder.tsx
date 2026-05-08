"use client";

import type { GameStep } from "@/types/games";

interface StepBuilderProps {
  steps: GameStep[];
  onChange: (steps: GameStep[]) => void;
}

export function StepBuilder({ steps, onChange }: StepBuilderProps) {
  function updateStep(i: number, field: keyof GameStep, value: string | number) {
    const next = steps.map((s, idx) =>
      idx === i ? { ...s, [field]: field === "estimatedMinutes" ? Number(value) || 0 : value } : s
    );
    onChange(next);
  }

  function addStep() {
    if (steps.length >= 5) return;
    onChange([...steps, { text: "", estimatedMinutes: 15 }]);
  }

  function removeStep(i: number) {
    if (steps.length <= 1) return;
    onChange(steps.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div
          key={i}
          className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-200"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80] text-xs font-bold shrink-0 mt-3">
            {i + 1}
          </div>
          <input
            type="text"
            placeholder={`Step ${i + 1} — what specifically will you do?`}
            value={step.text}
            onChange={(e) => updateStep(i, "text", e.target.value)}
            className="flex-1 glass-input bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#4ade80]/50 transition-colors"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              min={1}
              max={180}
              value={step.estimatedMinutes || ""}
              onChange={(e) => updateStep(i, "estimatedMinutes", e.target.value)}
              placeholder="min"
              className="w-16 glass-input bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground text-center focus:outline-none focus:border-[#4ade80]/50 transition-colors"
            />
            <span className="text-xs text-muted-foreground">min</span>
          </div>
          {steps.length > 1 && (
            <button
              onClick={() => removeStep(i)}
              className="mt-2.5 text-muted-foreground/50 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {steps.length < 5 && (
        <button
          onClick={addStep}
          className="w-full py-2.5 rounded-xl text-sm text-muted-foreground border border-dashed border-white/10 hover:border-[#4ade80]/30 hover:text-[#4ade80] transition-colors"
        >
          + Add step
        </button>
      )}

      <p className="text-xs text-muted-foreground text-right">{steps.length}/5 steps</p>
    </div>
  );
}
