"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [studyGoal, setStudyGoal] = useState("");
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [otherChallenge, setOtherChallenge] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [typicalHours, setTypicalHours] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("exam");
  const [submitting, setSubmitting] = useState(false);

  // Challenge options use translation keys; store key as value, display via t()
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
    const items = selectedChallenges.map((key) =>
      key === "onboarding.challenge.other"
        ? otherChallenge.trim() || "Other"
        : t(key)
    ).filter(Boolean);
    return JSON.stringify(items);
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
        router.push("/dashboard");
        router.refresh();
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
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i <= step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
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
                <Label className="text-foreground/80">
                  {t("onboarding.hoursLabel")}
                </Label>
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
                onClick={() => setStep(1)}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold"
              >
                {t("common.next")}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
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
                onClick={() => setStep(2)}
                disabled={selectedChallenges.length === 0}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold mt-2"
              >
                {t("common.next")}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
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
                      setStep(3);
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

        {step === 3 && (
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
