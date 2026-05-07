"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen } from "lucide-react";
import { useLanguage } from "@/lib/language";

const TOTAL_STEPS = 5; // 0=subject, 1=goal/hours, 2=challenges, 3=time, 4=event

export default function OnboardingPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  // Step 0 — subject selection
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [generatingTree, setGeneratingTree] = useState(false);
  const [treeError, setTreeError] = useState("");

  // Steps 1–4 — existing onboarding fields
  const [studyGoal, setStudyGoal] = useState("");
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [otherChallenge, setOtherChallenge] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [typicalHours, setTypicalHours] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("exam");
  const [submitting, setSubmitting] = useState(false);

  const challengeKeys = [
    "onboarding.challenge.starting",
    "onboarding.challenge.distracted",
    "onboarding.challenge.nothingSticks",
    "onboarding.challenge.cantFocus",
    "onboarding.challenge.procrastinate",
    "onboarding.challenge.dontKnowWhat",
    "onboarding.challenge.other",
  ];

  const timeKeys = [
    "onboarding.time.earlyMorning",
    "onboarding.time.lateMorning",
    "onboarding.time.afternoon",
    "onboarding.time.evening",
    "onboarding.time.lateNight",
    "onboarding.time.varies",
  ];

  const toggleChallenge = (key: string) => {
    setSelectedChallenges((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const buildBiggestChallenge = () => {
    const items = selectedChallenges
      .map((key) =>
        key === "onboarding.challenge.other"
          ? otherChallenge.trim() || "Other"
          : t(key)
      )
      .filter(Boolean);
    return JSON.stringify(items);
  };

  // Step 0: generate skill tree then advance
  const handleSubjectNext = async () => {
    if (!subjectName.trim()) return;
    setGeneratingTree(true);
    setTreeError("");

    const materialText = subjectDescription.trim()
      ? `${subjectName}\n\n${subjectDescription}`
      : subjectName;

    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: materialText, name: subjectName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate plan");
      }
      setStep(1);
    } catch (e) {
      setTreeError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGeneratingTree(false);
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyGoal,
          biggestChallenge: buildBiggestChallenge(),
          preferredTime: preferredTime ? t(preferredTime) : "",
          typicalHours,
          eventName,
          eventDate,
          eventType,
        }),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      }
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-lg w-full">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        {/* ── Step 0: Subject selection ── */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={20} className="text-primary" />
                <CardTitle className="text-foreground text-xl">What do you want to master?</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground/70">
                We'll build a personalized skill tree from your subject so you can be tested and guided step by step.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground/80">Subject or course name</Label>
                <Input
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Calculus, Python Programming, Organic Chemistry…"
                  className="bg-surface-inset border-border text-foreground"
                  disabled={generatingTree}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground/80">
                  What topics or concepts are you studying?{" "}
                  <span className="text-muted-foreground/50 font-normal">(optional but helps)</span>
                </Label>
                <Textarea
                  value={subjectDescription}
                  onChange={(e) => setSubjectDescription(e.target.value)}
                  placeholder="e.g. Derivatives, integrals, limits, the chain rule — preparing for a final exam…"
                  className="bg-surface-inset border-border text-foreground resize-none"
                  rows={3}
                  disabled={generatingTree}
                />
              </div>

              {treeError && (
                <p className="text-sm text-destructive">{treeError}</p>
              )}

              <Button
                onClick={handleSubjectNext}
                disabled={!subjectName.trim() || generatingTree}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-5"
              >
                {generatingTree ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Building your skill tree…
                  </span>
                ) : (
                  "Build my plan →"
                )}
              </Button>

              {generatingTree && (
                <p className="text-xs text-center text-muted-foreground/50">
                  Analysing your subject and mapping mastery paths — takes about 20 seconds
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 1: Study goal + hours ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-xl">
                {t("onboarding.studyGoalTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground/80">{t("onboarding.studyGoalLabel")}</Label>
                <Input
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.target.value)}
                  placeholder={t("onboarding.studyGoalPlaceholder")}
                  className="bg-surface-inset border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground/80">{t("onboarding.hoursLabel")}</Label>
                <Input
                  type="number"
                  value={typicalHours}
                  onChange={(e) => setTypicalHours(e.target.value)}
                  placeholder={t("onboarding.hoursPlaceholder")}
                  min="0"
                  max="16"
                  step="0.5"
                  className="bg-surface-inset border-border text-foreground"
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold"
              >
                {t("common.next")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Challenges ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-xl">
                {t("onboarding.challengesTitle")}
              </CardTitle>
              <p className="text-muted-foreground text-sm">{t("onboarding.challengesSubtitle")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {challengeKeys.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  onClick={() => toggleChallenge(key)}
                  className={`w-full text-left justify-start py-4 ${
                    selectedChallenges.includes(key)
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {t(key)}
                </Button>
              ))}
              {selectedChallenges.includes("onboarding.challenge.other") && (
                <Input
                  value={otherChallenge}
                  onChange={(e) => setOtherChallenge(e.target.value)}
                  placeholder={t("onboarding.challengePlaceholder")}
                  className="bg-surface-inset border-border text-foreground"
                />
              )}
              <Button
                onClick={() => setStep(3)}
                disabled={selectedChallenges.length === 0}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold mt-2"
              >
                {t("common.next")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Preferred time ── */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-xl">
                {t("onboarding.timeTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {timeKeys.map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    onClick={() => {
                      setPreferredTime(key);
                      setStep(4);
                    }}
                    className={`py-4 ${
                      preferredTime === key
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {t(key)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Upcoming event ── */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-xl">
                {t("onboarding.eventTitle")}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {t("onboarding.eventSubtitle")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground/80">{t("onboarding.eventNameLabel")}</Label>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder={t("onboarding.eventNamePlaceholder")}
                  className="bg-surface-inset border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground/80">{t("onboarding.eventDateLabel")}</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="bg-surface-inset border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground/80">{t("onboarding.eventTypeLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {["exam", "quiz", "deadline", "project"].map((v) => (
                    <Button
                      key={v}
                      variant="outline"
                      size="sm"
                      onClick={() => setEventType(v)}
                      className={`capitalize ${
                        eventType === v
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {t(`events.${v}`)}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleComplete}
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-6"
              >
                {submitting ? t("onboarding.settingUp") : t("onboarding.startObservation")}
              </Button>
              <Button
                variant="ghost"
                onClick={handleComplete}
                disabled={submitting}
                className="w-full text-muted-foreground/70 hover:text-foreground/80"
              >
                {t("onboarding.skipEvent")}
              </Button>
            </CardContent>
          </Card>
        )}

        {step > 0 && (
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            className="mt-4 text-muted-foreground/70 hover:text-foreground/80"
          >
            {t("onboarding.back")}
          </Button>
        )}
      </div>
    </div>
  );
}
