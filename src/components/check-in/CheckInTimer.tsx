"use client";

import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, Square, Coffee, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;
const FREE_PRESETS = [15, 20, 30, 45, 60];

// MM:SS for countdowns; HH:MM:SS for stopwatch when over an hour
function fmtCountdown(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
function fmtStopwatch(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0)
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type Mode = "stopwatch" | "free" | "pomodoro";
type Phase = "idle" | "working" | "break" | "stopped";

interface CheckInTimerProps {
  onStop: (durationMinutes: number, pomodoroCount: number) => void;
  onReset: () => void;
}

const MODES: { key: Mode; label: string }[] = [
  { key: "stopwatch", label: "Stopwatch" },
  { key: "free",      label: "Set duration" },
  { key: "pomodoro",  label: "Pomodoro" },
];

export function CheckInTimer({ onStop, onReset }: CheckInTimerProps) {
  const [open, setOpen]               = useState(false);
  const [mode, setMode]               = useState<Mode>("stopwatch");
  const [phase, setPhase]             = useState<Phase>("idle");
  const [running, setRunning]         = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const [countdown, setCountdown]     = useState(0);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [freeMins, setFreeMins]       = useState(30);
  const [customInput, setCustomInput] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      // Stopwatch: just count up
      if (mode === "stopwatch") {
        setElapsed((e) => e + 1);
        return;
      }

      // Free / Pomodoro: track elapsed + tick countdown
      setElapsed((e) => e + 1);
      setCountdown((c) => {
        if (c > 1) return c - 1;

        setRunning(false);
        clearInterval(intervalRef.current!);

        if (mode === "free") {
          setPhase("stopped");
          setElapsed((e) => {
            onStop(Math.floor((e + 1) / 60), 0);
            return e + 1;
          });
          return 0;
        }

        // Pomodoro
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
    setElapsed(0);
    setPomodoroCount(0);
    setPhase("working");
    if (mode === "stopwatch") {
      setRunning(true);
    } else {
      setCountdown(mode === "pomodoro" ? WORK_SECS : freeMins * 60);
      setRunning(true);
    }
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

  // ── Collapsed toggle ──────────────────────────────────────
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

  // ── Stopped summary ───────────────────────────────────────
  if (phase === "stopped") {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const color = mode === "stopwatch" ? "text-[#4ade80]" : "text-primary";
    const bg    = mode === "stopwatch" ? "bg-[#4ade80]/10 border-[#4ade80]/20" : "bg-primary/10 border-primary/20";
    return (
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${bg}`}>
        <div className={`flex items-center gap-2 ${color}`}>
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

  // ── Main card ─────────────────────────────────────────────
  const isStopwatch = mode === "stopwatch";
  const isBreak     = phase === "break";

  // Accent colours per state
  const accentText  = isBreak ? "text-[#fbbf24]" : isStopwatch ? "text-[#4ade80]" : "text-foreground";
  const accentBorder = isStopwatch && phase === "working"
    ? "border-[#4ade80]/20"
    : isBreak ? "border-[#fbbf24]/20" : "border-border";

  // Display value
  const displayValue = () => {
    if (phase === "idle") {
      if (isStopwatch) return "00:00";
      if (mode === "free") return fmtCountdown(freeMins * 60);
      return fmtCountdown(WORK_SECS);
    }
    if (isStopwatch) return fmtStopwatch(elapsed);
    return fmtCountdown(countdown);
  };

  return (
    <Card className={`transition-colors ${accentBorder}`}>
      <CardContent className="pt-4 pb-4 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Pulsing dot while running */}
            {running ? (
              <span className={`inline-block w-2 h-2 rounded-full ${isBreak ? "bg-[#fbbf24]" : isStopwatch ? "bg-[#4ade80]" : "bg-primary"} animate-pulse`} />
            ) : (
              <Timer size={14} className="text-muted-foreground/60" />
            )}
            <span className="text-foreground text-sm font-medium">
              {isBreak ? "Break" : isStopwatch && phase === "working" ? "Stopwatch running" : "Session Timer"}
            </span>
          </div>
          {phase === "idle" && (
            <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground/40 hover:text-muted-foreground text-xs">
              hide
            </button>
          )}
        </div>

        {/* Mode tabs (idle only) */}
        {phase === "idle" && (
          <div className="flex gap-1.5">
            {MODES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                  mode === key
                    ? key === "stopwatch"
                      ? "border-[#4ade80]/60 text-[#4ade80] bg-[#4ade80]/10"
                      : "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {label}
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
                  onChange={(e) => { setCustomInput(e.target.value); applyCustomMins(e.target.value); }}
                  placeholder="—"
                  className="w-12 px-2 py-1 rounded-md border border-border bg-surface-inset text-foreground text-xs text-center focus:border-primary outline-none"
                />
                <span className="text-muted-foreground/50 text-xs">min</span>
              </div>
            </div>
          </div>
        )}

        {/* Stopwatch idle hint */}
        {phase === "idle" && isStopwatch && (
          <p className="text-muted-foreground/50 text-xs">Counts up while you study. Stop it when you&apos;re done.</p>
        )}

        {/* Pomodoro idle hint */}
        {phase === "idle" && mode === "pomodoro" && (
          <p className="text-muted-foreground/50 text-xs">25 min focus · 5 min break, repeating.</p>
        )}

        {/* Timer display + controls */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            {/* Sub-label */}
            {isBreak && (
              <span className="text-[10px] text-[#fbbf24] uppercase tracking-wider flex items-center gap-1">
                <Coffee size={10} /> Break time
              </span>
            )}
            {phase === "working" && mode === "pomodoro" && pomodoroCount > 0 && (
              <span className="text-[10px] text-primary/60 uppercase tracking-wider">
                {pomodoroCount} 🍅 done
              </span>
            )}
            {isStopwatch && phase === "working" && (
              <span className="text-[10px] text-[#4ade80]/60 uppercase tracking-wider">elapsed</span>
            )}

            {/* Main time display */}
            <span className={`font-mono font-bold tracking-wide ${accentText} ${
              isStopwatch ? "text-4xl" : "text-3xl"
            }`}>
              {displayValue()}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {phase === "idle" ? (
              <button
                type="button"
                onClick={start}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isStopwatch
                    ? "bg-[#4ade80]/15 border border-[#4ade80]/40 text-[#4ade80] hover:bg-[#4ade80]/25"
                    : "bg-primary text-primary-foreground hover:bg-primary/80"
                }`}
              >
                <Play size={14} />
                Start
              </button>
            ) : isBreak ? (
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    isStopwatch
                      ? "border-[#4ade80]/30 text-[#4ade80] hover:bg-[#4ade80]/10"
                      : "border-primary/30 text-primary hover:bg-primary/10"
                  }`}
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
