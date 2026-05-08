"use client";

interface RecallInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onBlank: () => void;
  submitting: boolean;
}

export function RecallInput({ value, onChange, onSubmit, onBlank, submitting }: RecallInputProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="text-center">
        <h3 className="text-base font-semibold text-foreground mb-1">What do you remember?</h3>
        <p className="text-xs text-muted-foreground">Write down the key points from the card — in your own words.</p>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type what you remember…"
        rows={5}
        autoFocus
        className="w-full glass-input bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-[#38bdf8]/50 transition-colors"
      />

      <div className="flex gap-3">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8] hover:bg-[#38bdf8]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Evaluating…" : "Submit Recall →"}
        </button>
        <button
          onClick={onBlank}
          disabled={submitting}
          className="px-4 py-3 rounded-xl text-sm text-muted-foreground border border-white/10 hover:bg-white/[0.05] transition-colors disabled:opacity-50"
        >
          I don&apos;t remember
        </button>
      </div>
    </div>
  );
}
