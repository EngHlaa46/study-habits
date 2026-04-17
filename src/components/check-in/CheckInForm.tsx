"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Timer } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { CheckInTimer } from "@/components/check-in/CheckInTimer";

interface CheckInFormProps {
  activeSkillSlug?: string;
  aiQuestions?: string[];
  initialIntention?: string;
  initialDuration?: number;
  initialPomodoros?: number;
}

function getDateOffset(daysBack: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split("T")[0];
}

export function CheckInForm({
  activeSkillSlug,
  aiQuestions = [],
  initialIntention,
  initialDuration,
  initialPomodoros,
}: CheckInFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // null = today
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sessionType, setSessionType] = useState<"full" | "brief" | "no" | null>(null);
  const [sessionIntention, setSessionIntention] = useState(initialIntention ?? "");
  const [initiated, setInitiated] = useState<boolean | null>(null);
  const [focusLevel, setFocusLevel] = useState<string | null>(null);
  const [decayPoint, setDecayPoint] = useState<string | null>(null);
  const [contextNote, setContextNote] = useState("");
  const [atypical, setAtypical] = useState(false);
  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [missReason, setMissReason] = useState<string | null>(null);
  const [otherMissReason, setOtherMissReason] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [aiAnswers, setAiAnswers] = useState<string[]>(aiQuestions.map(() => ""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Voice inputs for text fields
  const intentionVoice = useVoiceInput({ getBase: () => sessionIntention, onResult: setSessionIntention });
  const contextVoice = useVoiceInput({ getBase: () => contextNote, onResult: setContextNote });
  const missReasonVoice = useVoiceInput({ getBase: () => otherMissReason, onResult: setOtherMissReason });

  // Inline timer result (overrides URL params when set)
  const [timerDuration, setTimerDuration] = useState<number | null>(null);
  const [timerPomodoros, setTimerPomodoros] = useState<number | null>(null);

  const activeDuration = timerDuration ?? initialDuration ?? null;
  const activePomodoros = timerPomodoros ?? initialPomodoros ?? null;

  const focusOptions = [
    { value: "none", label: t("checkin.focus.none"), description: t("checkin.focus.noneDesc") },
    { value: "brief", label: t("checkin.focus.brief"), description: t("checkin.focus.briefDesc") },
    { value: "focused", label: t("checkin.focus.focused"), description: t("checkin.focus.focusedDesc") },
    { value: "deep", label: t("checkin.focus.deep"), description: t("checkin.focus.deepDesc") },
  ];

  const decayOptions = [
    { value: "<10m", label: "< 10 min" },
    { value: "10-25m", label: "10-25 min" },
    { value: "25-45m", label: "25-45 min" },
    { value: "45-60m", label: "45-60 min" },
    { value: "no_loss", label: t("checkin.decay.noLoss") },
  ];

  const missReasonOptions = [
    { value: "Too busy", label: t("checkin.miss.tooBusy") },
    { value: "Forgot", label: t("checkin.miss.forgot") },
    { value: "Felt overwhelmed", label: t("checkin.miss.overwhelmed") },
    { value: "Wasn't in the mood", label: t("checkin.miss.notInMood") },
    { value: "External event", label: t("checkin.miss.externalEvent") },
    { value: "Other", label: t("checkin.miss.other") },
  ];

  const studyMethodOptions = [
    { value: "explain", label: t("checkin.method.explain") },
    { value: "qa", label: t("checkin.method.qa") },
    { value: "mindmap", label: t("checkin.method.mindmap") },
    { value: "notes", label: t("checkin.method.notes") },
    { value: "record", label: t("checkin.method.record") },
    { value: "read", label: t("checkin.method.read") },
  ];

  const hasAiQuestions = aiQuestions.length > 0;

  const showDecay = activeSkillSlug === "focus-endurance" && focusLevel && focusLevel !== "none";

  const getFinalMissReason = () => {
    if (!missReason) return null;
    if (missReason === "Other") return otherMissReason.trim() || "Other";
    return missReason;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    const filledAnswers = aiAnswers.map((a) => a.trim()).filter((a) => a.length > 0);
    const aiResponses =
      hasAiQuestions && filledAnswers.length > 0
        ? JSON.stringify({ questions: aiQuestions, answers: aiAnswers.map((a) => a.trim()) })
        : null;

    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initiated: initiated === true,
          focusLevel,
          decayPoint: showDecay ? decayPoint : null,
          contextNote: contextNote || null,
          atypical,
          energy,
          mood,
          missReason: getFinalMissReason(),
          studyMethod: selectedMethods.length > 0 ? selectedMethods : null,
          aiResponses,
          ...(selectedDate ? { date: selectedDate, backfilled: true } : {}),
          ...(sessionIntention.trim() ? { sessionIntention: sessionIntention.trim() } : {}),
          ...(activeDuration != null ? { sessionDuration: activeDuration } : {}),
          ...(activePomodoros != null ? { pomodoroCount: activePomodoros } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setError(t("checkin.alreadyCheckedIn"));
        } else {
          setError(data.error || "Failed to submit");
        }
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  };

  const dateOptions = [
    { label: t("checkin.yesterday"), value: getDateOffset(1) },
    { label: t("checkin.twoDaysAgo"), value: getDateOffset(2) },
    { label: t("checkin.threeDaysAgo"), value: getDateOffset(3) },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("checkin.title")}</h1>

      {/* Session summary badge (from /session page redirect) */}
      {initialDuration != null && timerDuration == null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm">
          <Timer size={15} />
          <span>
            Session timed: <strong>{initialDuration}min</strong>
            {initialPomodoros ? ` · ${initialPomodoros} pomodoro${initialPomodoros !== 1 ? "s" : ""}` : ""}
          </span>
        </div>
      )}

      {/* Pre-session intention (optional) */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-foreground text-sm font-medium">{t("checkin.intentionLabel")}</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={intentionVoice.toggle}
                disabled={intentionVoice.transcribing}
                title={intentionVoice.transcribing ? "Finalizing…" : intentionVoice.listening ? "Stop recording" : "Voice input"}
                className={`p-1 rounded transition-colors ${
                  intentionVoice.listening
                    ? "text-red-400 animate-pulse"
                    : intentionVoice.transcribing
                    ? "text-primary/60 animate-pulse"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                }`}
              >
                {intentionVoice.listening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              <button
                onClick={() => setSessionIntention("")}
                className="text-muted-foreground/50 text-xs hover:text-muted-foreground"
              >
                {t("checkin.intentionSkip")}
              </button>
            </div>
          </div>
          <Input
            value={sessionIntention}
            onChange={(e) => setSessionIntention(e.target.value)}
            placeholder={t("checkin.intentionPlaceholder")}
            className="bg-surface-inset border-border text-foreground text-sm"
            maxLength={300}
          />
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
              onClick={() => {
                setShowDatePicker((v) => !v);
                if (showDatePicker) setSelectedDate(null);
              }}
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
                  onClick={() => {
                    setSelectedDate(opt.value);
                    setShowDatePicker(false);
                  }}
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

      {/* Step 1: Did you study? */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-foreground text-lg mb-4">{t("checkin.didYouStudy")}</h3>
          <div className="flex gap-2">
            {[
              { type: "full" as const, label: t("checkin.fullSession") },
              { type: "brief" as const, label: t("checkin.briefly") },
              { type: "no" as const, label: t("common.no") },
            ].map((opt) => (
              <Button
                key={opt.type}
                variant="outline"
                onClick={() => {
                  setSessionType(opt.type);
                  if (opt.type === "full") {
                    setInitiated(true);
                    setFocusLevel(null);
                    setStep(1);
                    setSelectedMethods([]);
                  } else if (opt.type === "brief") {
                    setInitiated(true);
                    setFocusLevel("brief");
                    setStep(3);
                    setSelectedMethods([]);
                  } else {
                    setInitiated(false);
                    setStep(2);
                    setSelectedMethods([]);
                  }
                }}
                className={`flex-1 py-5 text-sm h-auto ${
                  sessionType === opt.type
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Why did you miss? (only when not studied) */}
      {step >= 2 && initiated === false && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h3 className="text-foreground text-lg mb-2">{t("checkin.whyDidYouMiss")}</h3>
            {missReasonOptions.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                onClick={() => {
                  setMissReason(opt.value);
                  if (opt.value !== "Other") setStep(4);
                }}
                className={`w-full text-left justify-start py-4 ${
                  missReason === opt.value
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {opt.label}
              </Button>
            ))}
            {missReason === "Other" && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    value={otherMissReason}
                    onChange={(e) => setOtherMissReason(e.target.value)}
                    placeholder={t("checkin.whatHappened")}
                    className="bg-surface-inset border-border text-foreground pr-9"
                  />
                  <button
                    type="button"
                    onClick={missReasonVoice.toggle}
                    disabled={missReasonVoice.transcribing}
                    title={missReasonVoice.listening ? "Stop recording" : "Voice input"}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                      missReasonVoice.listening
                        ? "text-red-400 animate-pulse"
                        : "text-muted-foreground/50 hover:text-muted-foreground"
                    }`}
                  >
                    {missReasonVoice.listening ? <MicOff size={13} /> : <Mic size={13} />}
                  </button>
                </div>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!otherMissReason.trim()}
                  className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold"
                >
                  {t("common.next")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Focus level (only when full session) */}
      {step >= 1 && sessionType === "full" && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-foreground text-lg mb-4">{t("checkin.howWasFocus")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {focusOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  onClick={() => {
                    setFocusLevel(opt.value);
                    setSelectedMethods([]);
                    setStep(3);
                  }}
                  className={`py-6 flex flex-col items-center gap-1 h-auto ${
                    focusLevel === opt.value
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs opacity-60">{opt.description}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decay point (Focus Endurance only) */}
      {step >= 4 && showDecay && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-foreground text-lg mb-4">{t("checkin.decay.whenDropped")}</h3>
            <div className="grid grid-cols-3 gap-2">
              {decayOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  onClick={() => setDecayPoint(opt.value)}
                  className={`py-4 text-sm ${
                    decayPoint === opt.value
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Study methods (only when studied) */}
      {step >= 3 && initiated === true && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-foreground text-lg">{t("checkin.whatMethod")}</h3>
              <span className="text-muted-foreground/60 text-xs mt-1">{t("checkin.optional")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {studyMethodOptions.map((opt) => {
                const active = selectedMethods.includes(opt.value);
                return (
                  <Button
                    key={opt.value}
                    variant="outline"
                    onClick={() =>
                      setSelectedMethods((prev) =>
                        active ? prev.filter((m) => m !== opt.value) : [...prev, opt.value]
                      )
                    }
                    className={`text-sm py-3 h-auto text-left justify-start ${
                      active
                        ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
            <Button
              onClick={() => setStep(4)}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold"
            >
              {selectedMethods.length > 0 ? t("common.continue") : t("common.skip")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Context & optional fields */}
      {step >= 4 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-foreground text-lg">
                  {t("checkin.anythingToNote")} <span className="text-muted-foreground/70 text-sm">{t("checkin.optional")}</span>
                </h3>
                <button
                  type="button"
                  onClick={contextVoice.toggle}
                  disabled={contextVoice.transcribing}
                  title={contextVoice.transcribing ? "Finalizing…" : contextVoice.listening ? "Stop recording" : "Voice input"}
                  className={`p-1.5 rounded-md transition-colors ${
                    contextVoice.listening
                      ? "text-red-400 bg-red-500/10 border border-red-500/40 animate-pulse"
                      : contextVoice.transcribing
                      ? "text-primary/60 animate-pulse"
                      : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {contextVoice.listening ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              </div>
              <Textarea
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                placeholder={t("checkin.contextPlaceholder")}
                className="bg-surface-inset border-border text-foreground resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="atypical"
                checked={atypical}
                onCheckedChange={(c) => setAtypical(c === true)}
                className="border-border data-[state=checked]:bg-[#fbbf24] data-[state=checked]:border-[#fbbf24]"
              />
              <label htmlFor="atypical" className="text-muted-foreground text-sm">
                {t("checkin.markAtypical")}
              </label>
            </div>

            {/* Energy & Mood bars */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs mb-2">{t("checkin.energyOptional")}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setEnergy(energy === v ? null : v)}
                      className={`flex-1 h-6 rounded ${
                        energy && v <= energy ? "bg-primary" : "bg-secondary"
                      } transition-colors`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-2">{t("checkin.moodOptional")}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMood(mood === v ? null : v)}
                      className={`flex-1 h-6 rounded ${
                        mood && v <= mood ? "bg-[#4ade80]" : "bg-secondary"
                      } transition-colors`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && !hasAiQuestions && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              onClick={() => hasAiQuestions ? setStep(5) : handleSubmit()}
              disabled={submitting || initiated === null}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-6"
            >
              {hasAiQuestions ? t("checkin.continueArrow") : submitting ? t("checkin.submitting") : t("checkin.submitCheckIn")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: AI reflection questions (skippable) */}
      {step >= 5 && hasAiQuestions && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-foreground text-lg">{t("checkin.quickReflection")}</h3>
              <span className="text-muted-foreground/60 text-xs mt-1">{t("checkin.optional")}</span>
            </div>
            {aiQuestions.map((q, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-foreground/80 text-sm">{q}</p>
                <Textarea
                  value={aiAnswers[i]}
                  onChange={(e) => {
                    const updated = [...aiAnswers];
                    updated[i] = e.target.value;
                    setAiAnswers(updated);
                  }}
                  placeholder={t("checkin.answerPlaceholder")}
                  className="bg-surface-inset border-border text-foreground resize-none text-sm"
                  rows={2}
                />
              </div>
            ))}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 border-border text-muted-foreground hover:border-muted-foreground"
              >
                {t("checkin.skipAndSubmit")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || initiated === null}
                className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold"
              >
                {submitting ? t("checkin.submitting") : t("checkin.submitCheckIn")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
