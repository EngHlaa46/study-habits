"use client";

import { useRouter } from "next/navigation";
import { GameCard } from "./GameCard";

interface StandardGamesSectionProps {
  hasNodes: boolean;
}

const GAMES = [
  {
    type: "quiz",
    title: "Knowledge Quiz",
    description: "AI generates questions from your uploaded study materials. Answer, get instant feedback, and watch your mastery scores climb.",
    badge: { label: "Cognitive", color: "#a855f7" },
    actionLabel: "Start Quiz →",
  },
  {
    type: "memory-sprint",
    title: "Memory Sprint",
    description: "A concept flashes for 12 seconds. Then it disappears — write down everything you remember. Your recall is scored by AI.",
    badge: { label: "Cognitive", color: "#38bdf8" },
    actionLabel: "Sprint →",
  },
  {
    type: "task-breakdown",
    title: "Task Breakdown",
    description: "AI gives you a vague study goal. Break it into concrete steps with time estimates. Sharpens your planning dimension.",
    badge: { label: "Planning", color: "#4ade80" },
    actionLabel: "Plan it →",
  },
];

export function StandardGamesSection({ hasNodes }: StandardGamesSectionProps) {
  const router = useRouter();

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Standard Games</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAMES.map((game) => (
          <GameCard
            key={game.type}
            title={game.title}
            description={game.description}
            badge={game.badge}
            actionLabel={game.actionLabel}
            onAction={() => router.push(`/games/${game.type}`)}
            disabled={!hasNodes && game.type !== "task-breakdown"}
          />
        ))}
      </div>
    </div>
  );
}
