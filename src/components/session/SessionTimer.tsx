"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Square, Timer, Coffee, Mic, MicOff } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

type TimerMode = "pomodoro" | "free";
type SessionPhase = "setup" | "working" | "break" | "done";

const POMODORO_WORK_SECS = 25 * 60;
const POMODORO_BREAK_SECS = 5 * 60;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatSeconds(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

export function SessionTimer() {
  const router = useRouter();
  const [phase, setPhase] = useState<SessionPhase>("setup");
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(POMODORO_WORK_SECS);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { listening, transcribing, toggle: toggleVoice } = useVoiceInput({
    getBase: () => goal,
    onResult: (val) => setGoal(val),
  });

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

      // Pomodoro countdown
      setCountdown((c) => {
        if (c > 1) {
          if (phase === "working") setElapsed((e) => e + 1);
          return c - 1;
        }
        // Interval complete
        setRunning(false);
        clearInterval(intervalRef.current!);
        if (phase === "working") {
          setPomodoroCount((n) => n + 1);
          setPhase("break");
          return POMODORO_BREAK_SECS;
        } else {
          setPhase("working");
          return POMODORO_WORK_SECS;
        }
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, phase]);

  const startSession = () => {
    setElapsed(0);
    setPomodoroCount(0);
    setCountdown(mode === "pomodoro" ? POMODORO_WORK_SECS : 0);
    setPhase("working");
    setRunning(true);
  };

  const stopSession = () => {
    setRunning(false);
    setPhase("done");
  };

  const startBreak = () => setRunning(true);

  const skipBreak = () => {
    setCountdown(POMODORO_WORK_SECS);
    setPhase("working");
    setRunning(true);
  };

  const logCheckIn = () => {
    const minutes = Math.floor(elapsed / 60);
    const params = new URLSearchParams();
    if (goal.trim()) params.set("intention", goal.trim());
    if (minutes > 0) params.set("duration", String(minutes));
    if (pomodoroCount > 0) params.set("pomodoros", String(pomodoroCount));
    router.push(`/check-in?${params.toString()}`);
  };

  // Setup screen
  if (phase === "setup") {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Start a Study Session</h1>
          <p className="text-muted-foreground text-sm mt-1">Set a goal, run the timer, then log your check-in automatically.</p>
        </div>

        {/* Goal */}
        <Card>
          <CardContent className="pt-5 pb-5 space-y-3">
            <label className="text-foreground text-sm font-medium">What&apos;s your goal for this session?</label>
            <div className="relative">
              <Textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Work through chapter 5 problems, review lecture notes on thermodynamics…"
                className="bg-surface-inset border-border text-foreground resize-none pr-10"
                rows={3}
                maxLength={300}
              />
              <button
                type="button"
                onClick={toggleVoice}
                disabled={transcribing}
                title={transcribing ? "Finalizing…" : listening ? "Stop recording" : "Voice input"}
                className={`absolute top-2 right-2 p-1.5 rounded-md transition-colors ${
                  listening
                    ? "text-red-400 bg-red-500/10 border border-red-500/40 animate-pulse"
                    : transcribing
                    ? "text-primary/60 animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {listening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            </div>
            <p className="text-muted-foreground/50 text-xs text-right">{goal.length}/300</p>
          </CardContent>
        </Card>

        {/* Mode selector */}
        <Card>
          <CardContent className="pt-5 pb-5 space-y-3">
            <p className="text-foreground text-sm font-medium">Timer mode</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("pomodoro")}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-lg border text-sm font-medium transition-colors ${
                  mode === "pomodoro"
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <Timer size={20} />
                <span>Pomodoro</span>
                <span className="text-xs opacity-60">25 min work / 5 min break</span>
              </button>
              <button
                onClick={() => setMode("free")}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-lg border text-sm font-medium transition-colors ${
                  mode === "free"
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <Play size={20} />
                <span>Free Timer</span>
                <span className="text-xs opacity-60">Count up, stop when done</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={startSession}
          className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-6 text-base"
        >
          Start Session
        </Button>
      </div>
    );
  }

  // Break screen
  if (phase === "break") {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Coffee size={24} className="text-[#fbbf24]" />
          <h1 className="text-2xl font-bold text-foreground">Break Time!</h1>
        </div>
        {goal.trim() && (
          <p className="text-muted-foreground/70 text-sm">Goal: {goal}</p>
        )}
        <Card>
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <p className="text-muted-foreground/60 text-sm">Break ends in</p>
            <span className="font-mono text-6xl font-bold text-[#fbbf24] tracking-wider">
              {formatSeconds(countdown)}
            </span>
            <p className="text-muted-foreground/50 text-xs">
              {pomodoroCount} {pomodoroCount === 1 ? "pomodoro" : "pomodoros"} completed
            </p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={skipBreak}
            variant="outline"
            className="border-border text-muted-foreground hover:border-muted-foreground"
          >
            Skip Break
          </Button>
          {!running ? (
            <Button
              onClick={startBreak}
              className="bg-[#fbbf24] hover:bg-[#fbbf24]/80 text-black font-semibold"
            >
              Start Break
            </Button>
          ) : (
            <Button
              onClick={stopSession}
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              End Session
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Done screen
  if (phase === "done") {
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Session Complete</h1>

        <Card>
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground text-sm">Study time</span>
              <span className="font-mono font-bold text-foreground text-lg">
                {minutes > 0 ? `${minutes}m ` : ""}{seconds > 0 ? `${seconds}s` : minutes > 0 ? "" : "0s"}
              </span>
            </div>
            {pomodoroCount > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground text-sm">Pomodoros</span>
                <span className="font-bold text-foreground">
                  {pomodoroCount} {"🍅".repeat(Math.min(pomodoroCount, 6))}
                </span>
              </div>
            )}
            {goal.trim() && (
              <div className="py-2">
                <p className="text-muted-foreground/60 text-xs mb-1">Goal</p>
                <p className="text-foreground/80 text-sm">{goal}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {elapsed >= 60 ? (
            <Button
              onClick={logCheckIn}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-6 text-base"
            >
              Log Check-in
            </Button>
          ) : (
            <Button
              onClick={logCheckIn}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-5"
            >
              Log Check-in Anyway
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="w-full border-border text-muted-foreground hover:border-muted-foreground"
          >
            Discard &amp; Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Working screen (pomodoro or free)
  const progress = mode === "pomodoro"
    ? ((POMODORO_WORK_SECS - countdown) / POMODORO_WORK_SECS) * 100
    : 0;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {mode === "pomodoro" ? `Pomodoro ${pomodoroCount + 1}` : "Study Session"}
        </h1>
        {pomodoroCount > 0 && (
          <span className="text-sm text-muted-foreground/70">
            {pomodoroCount} completed
          </span>
        )}
      </div>

      {goal.trim() && (
        <p className="text-muted-foreground/70 text-sm border-l-2 border-primary/40 pl-3">{goal}</p>
      )}

      <Card>
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-5">
          <span className="font-mono text-7xl font-bold text-foreground tracking-wider">
            {mode === "pomodoro" ? formatSeconds(countdown) : formatSeconds(elapsed)}
          </span>

          {mode === "pomodoro" && (
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors font-medium text-sm"
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
              {running ? "Pause" : "Resume"}
            </button>
            <button
              onClick={stopSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
            >
              <Square size={16} />
              Stop
            </button>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-muted-foreground/50 text-xs">
        Total study time: {formatSeconds(elapsed)}
      </p>
    </div>
  );
}
