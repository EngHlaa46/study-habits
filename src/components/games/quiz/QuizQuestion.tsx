"use client";

interface QuizQuestionProps {
  question: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number | null;
  onSelect: (index: number) => void;
}

export function QuizQuestion({ question, options, selectedIndex, correctIndex, onSelect }: QuizQuestionProps) {
  const revealed = correctIndex !== null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-400">
      <p className="text-base font-medium text-foreground leading-relaxed">{question}</p>

      <div className="grid gap-2.5">
        {options.map((opt, i) => {
          let borderColor = "border-white/10";
          let bg = "bg-white/[0.04] hover:bg-white/[0.08]";
          let textColor = "text-foreground";
          let icon: string | null = null;

          if (revealed) {
            if (i === correctIndex) {
              borderColor = "border-[#4ade80]/60";
              bg = "bg-[#4ade80]/10";
              textColor = "text-[#4ade80]";
              icon = "✓";
            } else if (i === selectedIndex && i !== correctIndex) {
              borderColor = "border-red-400/60";
              bg = "bg-red-400/10";
              textColor = "text-red-400";
              icon = "✗";
            } else {
              bg = "bg-white/[0.02]";
              textColor = "text-muted-foreground";
            }
          } else if (i === selectedIndex) {
            borderColor = "border-primary/60";
            bg = "bg-primary/10";
          }

          return (
            <button
              key={i}
              onClick={() => !revealed && onSelect(i)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 cursor-pointer disabled:cursor-default flex items-center gap-3 ${bg} ${borderColor} ${textColor}`}
            >
              <span className="text-xs font-mono text-muted-foreground/60 shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {icon && (
                <span className={`text-base font-bold shrink-0 ${i === correctIndex ? "text-[#4ade80]" : "text-red-400"}`}>
                  {icon}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
