"use client";

import { useRouter } from "next/navigation";
import { GameCard } from "./GameCard";

interface StandardGamesSectionProps {
  hasNodes: boolean;
  skillTreeId?: string;
}

const GAMES = [
  {
    type: "quiz",
    title: "Knowledge Quiz",
    description: "AI generates questions from your materials. Answer, get instant feedback, and watch your palm grow.",
    badge: { label: "Recall", color: "#a855f7" },
    actionLabel: "Start Quiz →",
    requiresNodes: true,
  },
  {
    type: "scenario",
    title: "Skill Scenario",
    description: "Choose-your-adventure decisions. Right choices water your palm, wrong ones wilt it.",
    badge: { label: "Application", color: "#38bdf8" },
    actionLabel: "Play Scenario →",
    requiresNodes: true,
  },
  {
    type: "speed-round",
    title: "Speed Round",
    description: "60 seconds. Rapid-fire true/false and match questions. Harder as your palm grows.",
    badge: { label: "Speed", color: "#4ade80" },
    actionLabel: "Start →",
    requiresNodes: true,
  },
  {
    type: "memory-sprint",
    title: "Memory Sprint",
    description: "A concept flashes for 12 seconds. Write down everything you remember. Scored by AI.",
    badge: { label: "Memory", color: "#fbbf24" },
    actionLabel: "Sprint →",
    requiresNodes: true,
  },
  {
    type: "task-breakdown",
    title: "Task Breakdown",
    description: "AI gives you a vague study goal. Break it into concrete steps. Sharpens planning.",
    badge: { label: "Planning", color: "#f97316" },
    actionLabel: "Plan it →",
    requiresNodes: false,
  },
];

export function StandardGamesSection({ hasNodes, skillTreeId }: StandardGamesSectionProps) {
  const router = useRouter();

  function getPath(type: string) {
    const base = `/games/${type}`;
    return skillTreeId ? `${base}?skillTreeId=${skillTreeId}` : base;
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Games</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAMES.map((game) => (
          <GameCard
            key={game.type}
            title={game.title}
            description={game.description}
            badge={game.badge}
            actionLabel={game.actionLabel}
            onAction={() => router.push(getPath(game.type))}
            disabled={game.requiresNodes && !hasNodes}
          />
        ))}
      </div>
    </div>
  );
}
