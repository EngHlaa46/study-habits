"use client";

import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, Square, Coffee, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;
const FREE_PRESETS = [15, 20, 30, 45, 60];

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
  const [elapsed, setElapsed] = useState(0);   // total study seconds (for final report)
  const [countdown, setCountdown] = useState(0);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [freeMins, setFreeMins] = useState(30);
  const [customInput, setCustomInput] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);

      setCountdown((c) => {
        if (c > 1) return c - 1;

        // Countdown hit zero
        setRunning(false);
        clearInterval(intervalRef.current!);

        if (mode === "free") {
          // Free timer done — auto stop
          setPhase("stopped");
          setElapsed((e) => {
            onStop(Math.floor((e + 1) / 60), 0);
            return e + 1;
          });
          return 0;
        }

        // Pomodoro interval done
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
  }, [running, mode, phase, onStop]);

  const start = () => {
    const secs = mode === "pomodoro" ? WORK_SECS : freeMins * 60;
    setElapsed(0);
    setPomodoroCount(0);
    setCountdown(secs);
    setPhase("working");
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setPhase("stopped");
    onStop(Math.floor(elapsed / 60), pomodoroCount);
  };

  const reset = () => {
    setRunning(false);
    setPhase("idle");
    setElapsed(0);
    setCountdown(0);
    setPomodoroCount(0);
    setCustomInput("");
    onReset();
  };

  const skipBreak = () => {
    setCountdown(WORK_SECS);
    setPhase("working");
    setRunning(true);
  };

  const applyCustomMins = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > 0 && n <= 300) setFreeMins(n);
  };

  // Collapsed toggle
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

  // Stopped — compact summary
  if (phase === "stopped") {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
        <div className="flex items-center gap-2 text-primary">
          <Timer size={14} />
          <span>
            <strong>{mins > 0 ? `${mins}m` : ""}{(secs > 0 || mins === 0) ? ` ${secs}s` : ""}</strong> timed
            {pomodoroCount > 0 && <span className="ml-1.5 text-muted-foreground/70">· {pomodoroCount} 🍅</span>}
          </span>
        </div>
        <button type="button" onClick={reset} title="Reset" className="text-muted-foreground/50 hover:text-muted-foreground">
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
            <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground/40 hover:text-muted-foreground text-xs">
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
                  mode === m ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {m === "pomodoro" ? "Pomodoro (25/5)" : "Set duration"}
              </button>
            ))}
          </div>
        )}

        {/* Free timer: duration picker (idle only) */}
        {phase === "idle" && mode === "free" && (
          <div className="space-y-2">
            <p className="text-muted-foreground/60 text-xs">How long are you studying?</p>
            <div className="flex gap-1.5 flex-wrap">
              {FREE_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setFreeMins(m); setCustomInput(""); }}
                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                    freeMins === m && !customInput
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {m}m
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value);
                    applyCustomMins(e.target.value);
                  }}
                  placeholder="—"
                  className="w-12 px-2 py-1 rounded-md border border-border bg-surface-inset text-foreground text-xs text-center focus:border-primary outline-none"
                />
                <span className="text-muted-foreground/50 text-xs">min</span>
              </div>
            </div>
          </div>
        )}

        {/* Timer display + controls */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {phase === "break" && (
              <span className="text-[10px] text-[#fbbf24] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Coffee size={10} /> Break
              </span>
            )}
            {phase === "working" && mode === "pomodoro" && pomodoroCount > 0 && (
              <span className="text-[10px] text-primary/60 uppercase tracking-wider mb-0.5">
                {pomodoroCount} 🍅 done
              </span>
            )}
            <span className={`font-mono text-3xl font-bold tracking-wide ${phase === "break" ? "text-[#fbbf24]" : "text-foreground"}`}>
              {phase === "idle"
                ? fmt(mode === "free" ? freeMins * 60 : WORK_SECS)
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
                <button type="button" onClick={skipBreak} className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:border-muted-foreground transition-colors">
                  Skip
                </button>
                {!running && (
                  <button type="button" onClick={() => setRunning(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fbbf24]/20 border border-[#fbbf24]/30 text-[#fbbf24] text-xs font-medium">
                    <Play size={12} /> Break
                  </button>
                )}
                <button type="button" onClick={stop} title="End session" className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
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
                <button type="button" onClick={stop} title="Stop & log time" className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                  <Square size={14} />
                </button>
              </>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
