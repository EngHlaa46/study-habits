"use client";

import { motion } from "framer-motion";
import { staggerItem } from "@/lib/motion";

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
    <motion.div
      variants={staggerItem}
      whileHover={!disabled ? { y: -6, boxShadow: `0 20px 40px ${badge.color}20` } : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="glass-card glass-panel p-6 flex flex-col gap-4 group"
    >
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

      {stat && <p className="text-xs text-muted-foreground/70">{stat}</p>}

      <motion.button
        onClick={onAction}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.03, boxShadow: `0 0 16px ${badge.color}40` } : undefined}
        whileTap={!disabled ? { scale: 0.97 } : undefined}
        transition={{ type: "spring", stiffness: 480, damping: 22 }}
        className="mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: disabled ? undefined : `linear-gradient(135deg, ${badge.color}30, ${badge.color}15)`,
          border: `1px solid ${badge.color}50`,
          color: badge.color,
        }}
      >
        {disabled ? "No materials yet" : actionLabel}
      </motion.button>
    </motion.div>
  );
}
