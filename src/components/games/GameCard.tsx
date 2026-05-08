"use client";

interface GameCardProps {
  title: string;
  description: string;
  badge: { label: string; color: string };
  actionLabel: string;
  onAction: () => void;
  stat?: string;
  disabled?: boolean;
}

export function GameCard({ title, description, badge, actionLabel, onAction, stat, disabled }: GameCardProps) {
  return (
    <div className="glass-card glass-panel p-6 flex flex-col gap-4 group hover:scale-[1.02] transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full border shrink-0"
          style={{ color: badge.color, borderColor: `${badge.color}40`, backgroundColor: `${badge.color}15` }}
        >
          {badge.label}
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

      {stat && (
        <p className="text-xs text-muted-foreground/70">{stat}</p>
      )}

      <button
        onClick={onAction}
        disabled={disabled}
        className="mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: disabled ? undefined : `linear-gradient(135deg, ${badge.color}30, ${badge.color}15)`,
          border: `1px solid ${badge.color}50`,
          color: badge.color,
        }}
      >
        {disabled ? "No materials yet" : actionLabel}
      </button>
    </div>
  );
}
