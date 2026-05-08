"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GameDay {
  date: string;
  sessionCount: number;
  avgScore: number;
  gameTypes: string[];
  xp: number;
}

interface CalendarGridProps {
  gameDays: GameDay[];
}

const GAME_LABELS: Record<string, string> = {
  QUIZ: "Quiz",
  MEMORY_SPRINT: "Memory Sprint",
  TASK_BREAKDOWN: "Task Breakdown",
  SCENARIO: "Scenario",
  SPEED_ROUND: "Speed Round",
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayBg(avgScore: number): string {
  if (avgScore >= 0.7) return "bg-[#4ade80]";
  if (avgScore >= 0.4) return "bg-[#fbbf24]";
  return "bg-[#38bdf8]";
}

export function CalendarGrid({ gameDays }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<GameDay | null>(null);

  const dayMap = new Map<string, GameDay>();
  for (const d of gameDays) dayMap.set(d.date, d);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const gd = dayMap.get(dateStr);
    const isToday = dateStr === new Date().toISOString().split("T")[0];
    const isFuture = new Date(dateStr) > new Date();
    const isSelected = selectedDay?.date === dateStr;

    cells.push(
      <button
        key={day}
        onClick={() => gd ? setSelectedDay(isSelected ? null : gd) : null}
        disabled={isFuture || !gd}
        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all
          ${gd ? dayBg(gd.avgScore) : "bg-secondary/40"}
          ${isToday ? "ring-2 ring-white/60" : ""}
          ${isSelected ? "ring-2 ring-white/80 scale-105" : ""}
          ${gd ? "cursor-pointer hover:opacity-80" : "cursor-default"}
          ${isFuture ? "opacity-20" : gd ? "opacity-90" : "opacity-40"}
        `}
      >
        <span className={gd ? "text-black/80 font-semibold" : "text-muted-foreground/50"}>{day}</span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDay(null); }}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-foreground font-semibold">{monthLabel}</h3>
            <button
              onClick={() => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDay(null); }}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground/60 font-medium py-1">{d}</div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${year}-${month}`}
              className="grid grid-cols-7 gap-1"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              {cells}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#38bdf8]" />
              <span className="text-muted-foreground/70 text-xs">Practiced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#fbbf24]" />
              <span className="text-muted-foreground/70 text-xs">Good</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#4ade80]" />
              <span className="text-muted-foreground/70 text-xs">Strong</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="pt-4 pb-4">
                <h3 className="text-foreground font-semibold mb-3 text-sm">
                  {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric",
                  })}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">Sessions</span>
                    <span className="text-foreground/80">{selectedDay.sessionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">Avg score</span>
                    <span className="text-foreground/80">{Math.round(selectedDay.avgScore * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">XP earned</span>
                    <span className="text-[#fbbf24]">+{selectedDay.xp}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground/70">Games</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {selectedDay.gameTypes.map((gt) => (
                        <span key={gt} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {GAME_LABELS[gt] ?? gt}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
