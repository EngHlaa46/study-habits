"use client";

interface ConceptCardProps {
  name: string;
  summary: string;
  timeRemaining: number;
  totalTime: number;
}

export function ConceptCard({ name, summary, timeRemaining, totalTime }: ConceptCardProps) {
  const progress = timeRemaining / totalTime;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const ringColor = timeRemaining > totalTime * 0.5 ? "#38bdf8" : timeRemaining > totalTime * 0.25 ? "#fbbf24" : "#f87171";

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
      {/* Countdown ring */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
          />
        </svg>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color: ringColor }}>{timeRemaining}</span>
          <span className="text-xs text-muted-foreground">sec</span>
        </div>
      </div>

      {/* Concept card */}
      <div
        className="w-full glass-card glass-panel p-6 border-l-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ borderLeftColor: "#38bdf8" }}
      >
        <h3 className="text-lg font-semibold text-[#38bdf8] mb-3">{name}</h3>
        <p className="text-sm text-foreground leading-relaxed">{summary}</p>
      </div>

      <p className="text-xs text-muted-foreground text-center">Read carefully. The card disappears when the timer hits zero.</p>
    </div>
  );
}
