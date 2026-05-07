"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Timer, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { CheckInTimer } from "@/components/check-in/CheckInTimer";
import type { CheckInQuestion } from "@/lib/ai/dcs/checkInAgent";

const DEFAULT_QUESTIONS: CheckInQuestion[] = [
  { id: "q1", question: "How has your day been going overall?" },
  { id: "q2", question: "What did you end up spending your study time on today?" },
  { id: "q3", question: "Anything in your environment or headspace worth noting?" },
];

function getDateOffset(daysBack: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split("T")[0];
}

interface CheckInFormProps {
  baselineQuestions?: CheckInQuestion[];
  activeSkillSlug?: string;
  initialDuration?: number;
  initialPomodoros?: number;
}

export function CheckInForm({
  baselineQuestions,
  initialDuration,
  initialPomodoros,
}: CheckInFormProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const questions = baselineQuestions && baselineQuestions.length > 0 ? baselineQuestions : DEFAULT_QUESTIONS;
  const [responses, setResponses] = useState<string[]>(questions.map(() => ""));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number | null>(null);
  const [timerPomodoros, setTimerPomodoros] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeDuration = timerDuration ?? initialDuration ?? null;
  const activePomodoros = timerPomodoros ?? initialPomodoros ?? null;

  const voice0 = useVoiceInput({ getBase: () => responses[0] ?? "", onResult: (v) => setResponse(0, v) });
  const voice1 = useVoiceInput({ getBase: () => responses[1] ?? "", onResult: (v) => setResponse(1, v) });
  const voice2 = useVoiceInput({ getBase: () => responses[2] ?? "", onResult: (v) => setResponse(2, v) });
  const voiceInputs = [voice0, voice1, voice2];

  function setResponse(idx: number, val: string) {
    setResponses((prev) => { const next = [...prev]; next[idx] = val; return next; });
  }

  const dateOptions = [
    { label: t("checkin.yesterday"), value: getDateOffset(1) },
    { label: t("checkin.twoDaysAgo"), value: getDateOffset(2) },
    { label: t("checkin.threeDaysAgo"), value: getDateOffset(3) },
  ];

  const hasAtLeastOneAnswer = responses.some((r) => r.trim().length > 0);

  const handleSubmit = async () => {
    if (!hasAtLeastOneAnswer) { setError("Please answer at least one question."); return; }
    setSubmitting(true);
    setError("");

    try {
      const interpretRes = await fetch("/api/check-in-interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          responses,
          ...(selectedDate ? { date: selectedDate } : {}),
        }),
      });

      if (!interpretRes.ok) {
        const data = await interpretRes.json();
        if (interpretRes.status === 409) {
          setError(t("checkin.alreadyCheckedIn"));
        } else {
          setError(data.error || "Failed to submit");
        }
        setSubmitting(false);
        return;
      }

      const { signals } = await interpretRes.json();

      // Also persist a lightweight legacy CheckIn record for backward compat
      await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initiated: signals?.studyInitiated ?? true,
          focusLevel: signals?.focusQuality === "high" ? "deep"
            : signals?.focusQuality === "moderate" ? "focused"
            : signals?.focusQuality === "low" ? "brief"
            : null,
          contextNote: signals?.summary || null,
          aiResponses: JSON.stringify({ questions: questions.map((q) => q.question), answers: responses }),
          ...(selectedDate ? { date: selectedDate, backfilled: true } : {}),
          ...(activeDuration != null ? { sessionDuration: activeDuration } : {}),
          ...(activePomodoros != null ? { pomodoroCount: activePomodoros } : {}),
        }),
      });

      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("checkin.title")}</h1>
        <p className="text-sm text-muted-foreground/60 mt-1">Answer what feels relevant — skip what doesn't apply.</p>
      </div>

      {/* Session timer badge */}
      {initialDuration != null && timerDuration == null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm">
          <Timer size={15} />
          <span>
            Session timed: <strong>{initialDuration}min</strong>
            {initialPomodoros ? ` · ${initialPomodoros} pomodoro${initialPomodoros !== 1 ? "s" : ""}` : ""}
          </span>
        </div>
      )}

      {/* Baseline AI questions */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-5">
          {questions.map((q, i) => {
            const voice = voiceInputs[i];
            return (
              <div key={q.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
                  {voice && (
                    <button
                      type="button"
                      onClick={voice.toggle}
                      disabled={voice.transcribing}
                      title={voice.transcribing ? "Finalizing…" : voice.listening ? "Stop recording" : "Voice input"}
                      className={`p-1 rounded shrink-0 transition-colors ${
                        voice.listening
                          ? "text-red-400 animate-pulse"
                          : voice.transcribing
                          ? "text-primary/60 animate-pulse"
                          : "text-muted-foreground/40 hover:text-muted-foreground"
                      }`}
                    >
                      {voice.listening ? <MicOff size={13} /> : <Mic size={13} />}
                    </button>
                  )}
                </div>
                <Textarea
                  value={responses[i]}
                  onChange={(e) => setResponse(i, e.target.value)}
                  placeholder="Type your answer…"
                  className="bg-surface-inset border-border text-foreground resize-none text-sm"
                  rows={2}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Inline session timer */}
      <CheckInTimer
        onStop={(mins, pomos) => { setTimerDuration(mins); setTimerPomodoros(pomos > 0 ? pomos : null); }}
        onReset={() => { setTimerDuration(null); setTimerPomodoros(null); }}
      />

      {/* Date selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm font-medium">
              {selectedDate
                ? `${t("checkin.checkingInFor")} ${dateOptions.find((d) => d.value === selectedDate)?.label ?? selectedDate}`
                : t("checkin.today")}
            </span>
            <button
              onClick={() => { setShowDatePicker((v) => !v); if (showDatePicker) setSelectedDate(null); }}
              className="text-primary text-xs hover:underline"
            >
              {showDatePicker ? t("common.cancel") : t("checkin.differentDay")}
            </button>
          </div>
          {showDatePicker && (
            <div className="flex gap-2 mt-3">
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSelectedDate(opt.value); setShowDatePicker(false); }}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    selectedDate === opt.value
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={submitting || !hasAtLeastOneAnswer}
        className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-6"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Saving your check-in…
          </span>
        ) : (
          t("checkin.submitCheckIn")
        )}
      </Button>
    </div>
  );
}
