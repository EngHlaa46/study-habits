"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language";

interface CheckInEntry {
  id: string;
  date: string;
  initiated: boolean;
  focusLevel: string | null;
  decayPoint: string | null;
  contextNote: string | null;
  atypical: boolean;
  energy: number | null;
  mood: number | null;
  backfilled: boolean;
}

interface CalendarGridProps {
  checkIns: CheckInEntry[];
}

const focusColors: Record<string, string> = {
  none: "bg-gray-600",
  brief: "bg-yellow-500",
  focused: "bg-[#38bdf8]",
  deep: "bg-[#4ade80]",
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarGrid({ checkIns }: CalendarGridProps) {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<CheckInEntry | null>(null);

  const ciMap = new Map<string, CheckInEntry>();
  for (const ci of checkIns) {
    ciMap.set(ci.date, ci);
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells = [];
  // Empty cells for days before the 1st
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const ci = ciMap.get(dateStr);
    const isToday = dateStr === new Date().toISOString().split("T")[0];
    const isFuture = new Date(dateStr) > new Date();

    let bgClass = "bg-surface-inset";
    if (ci && ci.initiated) {
      bgClass = focusColors[ci.focusLevel || "none"];
    } else if (ci && !ci.initiated) {
      bgClass = "bg-gray-700";
    }

    cells.push(
      <button
        key={day}
        onClick={() => ci ? setSelectedDay(ci) : setSelectedDay(null)}
        disabled={isFuture}
        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${bgClass} ${
          isToday ? "ring-2 ring-[#38bdf8]" : ""
        } ${ci ? "cursor-pointer hover:opacity-80" : "cursor-default"} ${
          isFuture ? "opacity-30" : "opacity-80"
        } ${ci?.atypical ? "ring-1 ring-[#fbbf24]" : ""}`}
      >
        <span className={ci?.initiated ? "text-black/80" : "text-muted-foreground/70"}>
          {day}
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-foreground font-semibold">{monthLabel}</h3>
            <button
              onClick={nextMonth}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((d) => (
              <div
                key={d}
                className="text-center text-xs text-muted-foreground/60 font-medium py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">{cells}</div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-700" />
              <span className="text-muted-foreground/70 text-xs">{t("history.noFocus")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-yellow-500" />
              <span className="text-muted-foreground/70 text-xs">{t("history.brief")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#38bdf8]" />
              <span className="text-muted-foreground/70 text-xs">{t("history.focused")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#4ade80]" />
              <span className="text-muted-foreground/70 text-xs">{t("history.deep")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedDay && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h3 className="text-foreground font-semibold mb-3">
              {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground/70">{t("history.studied")}</span>
                <span className="text-foreground/80">
                  {selectedDay.initiated ? t("common.yes") : t("common.no")}
                </span>
              </div>
              {selectedDay.focusLevel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground/70">{t("history.focusLevel")}</span>
                  <span className="text-foreground/80 capitalize">
                    {selectedDay.focusLevel}
                  </span>
                </div>
              )}
              {selectedDay.decayPoint && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground/70">{t("history.focusDecay")}</span>
                  <span className="text-foreground/80">{selectedDay.decayPoint}</span>
                </div>
              )}
              {selectedDay.energy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground/70">{t("history.energy")}</span>
                  <span className="text-foreground/80">{selectedDay.energy}/5</span>
                </div>
              )}
              {selectedDay.mood && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground/70">{t("history.mood")}</span>
                  <span className="text-foreground/80">{selectedDay.mood}/5</span>
                </div>
              )}
              {selectedDay.contextNote && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground/70 text-xs mb-1">{t("history.note")}</p>
                  <p className="text-foreground/80">{selectedDay.contextNote}</p>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                {selectedDay.atypical && (
                  <span className="text-xs bg-[#fbbf24]/10 text-[#fbbf24] px-2 py-0.5 rounded">
                    {t("history.atypical")}
                  </span>
                )}
                {selectedDay.backfilled && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                    {t("history.backfilled")}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
