"use client";

import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, Square, Coffee, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

function fmt(secs: number) {
  return `${Math.floor(secs / 60).toString().padStart(2, "0")}:${(secs % 60).toString().padStart(2, "0")}`;
}

type Phase = "idle" | "working" | "break" | "stopped";

interface CheckInTimerProps {
  onStop: (durationMinutes: number, pomodoroCount: number) => void;
  onReset: () => void;
}

export function CheckInTimer({ onStop, onReset }: CheckInTimerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"free" | "pomodoro">("free");
  const [phase, setPhase] = useState<Phase>("idle");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(WORK_SECS);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (mode === "free") {
        setElapsed((e) => e + 1);
        return;
      }

      setCountdown((c) => {
        if (c > 1) {
          if (phase === "working") setElapsed((e) => e + 1);
          return c - 1;
        }
        setRunning(false);
        clearInterval(intervalRef.current!);
        if (phase === "working") {
          setPomodoroCount((n) => n + 1);
          setPhase("break");
          return BREAK_SECS;
        } else {
          setPhase("working");
          return WORK_SECS;
        }
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, phase]);

  const start = () => {
    setElapsed(0);
    setPomodoroCount(0);
    setCountdown(mode === "pomodoro" ? WORK_SECS : 0);
    setPhase("working");
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setPhase("stopped");
    const minutes = Math.floor(elapsed / 60);
    onStop(minutes, pomodoroCount);
  };

  const reset = () => {
    setRunning(false);
    setPhase("idle");
    setElapsed(0);
    setCountdown(WORK_SECS);
    setPomodoroCount(0);
    onReset();
  };

  const skipBreak = () => {
    setCountdown(WORK_SECS);
    setPhase("working");
    setRunning(true);
  };

  // Collapsed toggle button
  if (!open && phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
      >
        <Timer size={13} />
        <span>Add timer</span>
      </button>
    );
  }

  // Stopped — compact summary inside the form
  if (phase === "stopped") {
    const minutes = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
        <div className="flex items-center gap-2 text-primary">
          <Timer size={14} />
          <span>
            <strong>{minutes > 0 ? `${minutes}m` : ""}{secs > 0 || minutes === 0 ? ` ${secs}s` : ""}</strong> timed
            {pomodoroCount > 0 && <span className="ml-1.5 text-muted-foreground/70">· {pomodoroCount} 🍅</span>}
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          title="Reset timer"
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-primary" />
            <span className="text-foreground text-sm font-medium">Session Timer</span>
          </div>
          {phase === "idle" && (
            <button
              type="button"
              onClick={() => { setOpen(false); }}
              className="text-muted-foreground/40 hover:text-muted-foreground text-xs"
            >
              hide
            </button>
          )}
        </div>

        {/* Mode selector (idle only) */}
        {phase === "idle" && (
          <div className="flex gap-2">
            {(["free", "pomodoro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                  mode === m
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {m === "pomodoro" ? "Pomodoro (25/5)" : "Free timer"}
              </button>
            ))}
          </div>
        )}

        {/* Timer display */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {phase === "break" && (
              <span className="text-[10px] text-[#fbbf24] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Coffee size={10} /> Break
              </span>
            )}
            {phase === "working" && mode === "pomodoro" && (
              <span className="text-[10px] text-primary/60 uppercase tracking-wider mb-0.5">
                Focus {pomodoroCount > 0 ? `· ${pomodoroCount} 🍅 done` : ""}
              </span>
            )}
            <span className={`font-mono text-3xl font-bold tracking-wide ${
              phase === "break" ? "text-[#fbbf24]" : "text-foreground"
            }`}>
              {mode === "free" || phase === "idle"
                ? fmt(elapsed)
                : fmt(countdown)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {phase === "idle" ? (
              <button
                type="button"
                onClick={start}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
              >
                <Play size={14} />
                Start
              </button>
            ) : phase === "break" ? (
              <>
                <button
                  type="button"
                  onClick={skipBreak}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:border-muted-foreground transition-colors"
                >
                  Skip
                </button>
                {!running && (
                  <button
                    type="button"
                    onClick={() => setRunning(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fbbf24]/20 border border-[#fbbf24]/30 text-[#fbbf24] text-xs font-medium"
                  >
                    <Play size={12} /> Break
                  </button>
                )}
                <button
                  type="button"
                  onClick={stop}
                  className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  title="End session"
                >
                  <Square size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setRunning((r) => !r)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
                >
                  {running ? <Pause size={12} /> : <Play size={12} />}
                  {running ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={stop}
                  className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Stop & log time"
                >
                  <Square size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {mode === "free" && phase === "working" && (
          <p className="text-muted-foreground/40 text-[10px]">Press stop when you&apos;re done to log your study time.</p>
        )}
      </CardContent>
    </Card>
  );
}
