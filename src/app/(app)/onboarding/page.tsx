"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Upload, X } from "lucide-react";
import { useLanguage } from "@/lib/language";

const TOTAL_STEPS = 5; // 0=subject, 1=goal/hours, 2=challenges, 3=time, 4=event

function OnboardingContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const returning = searchParams.get("returning") === "true";

  const [step, setStep] = useState(0);

  // Step 0 — subject selection
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatingTree, setGeneratingTree] = useState(false);
  const [treeError, setTreeError] = useState("");

  // Steps 1–4 — existing onboarding fields
  const [studyGoal, setStudyGoal] = useState("");
  const [goalOptions, setGoalOptions] = useState<string[]>([]);
  const [goalOther, setGoalOther] = useState(false);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [otherChallenge, setOtherChallenge] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [typicalHours] = useState("");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadedFile(file);
    if (file && !subjectName.trim()) {
      // Pre-fill subject name from filename (strip extension)
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setSubjectName(name);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Step 0: generate skill tree then advance
  const handleSubjectNext = async () => {
    if (subjectName.trim().length < 3) {
      setTreeError("Please enter a subject name (at least 3 characters).");
      return;
    }
    setGeneratingTree(true);
    setTreeError("");

    try {
      let res: Response;

      if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("name", subjectName.trim());
        if (subjectDescription.trim()) {
          formData.append("description", subjectDescription.trim());
        }
        res = await fetch("/api/materials", { method: "POST", body: formData });
      } else {
        const materialText = subjectDescription.trim()
          ? `${subjectName}\n\n${subjectDescription}`
          : subjectName;
        res = await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: materialText, name: subjectName.trim() }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate plan");
      }
      if (Array.isArray(data.studyGoals) && data.studyGoals.length > 0) {
        setGoalOptions(data.studyGoals);
      }

      if (returning) {
        window.location.href = "/dashboard";
      } else {
        setStep(1);
      }
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
        {/* Progress dots — hidden for returning users (they only do step 0) */}
        {!returning && (
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
        )}

        {/* ── Step 0: Subject selection ── */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={20} className="text-primary" />
                <CardTitle className="text-foreground text-xl">
                  {returning ? "Add a new subject" : "What do you want to master?"}
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground/70">
                {returning
                  ? "Upload your course material or describe a subject and we'll build a personalised skill tree."
                  : "We'll build a personalized skill tree from your subject so you can be tested and guided step by step."}
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

              {/* File upload */}
              <div className="space-y-2">
                <Label className="text-foreground/80">
                  Upload course material{" "}
                  <span className="text-muted-foreground/50 font-normal">(PDF, .txt, .md — optional)</span>
                </Label>
                {uploadedFile ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/5">
                    <Upload size={14} className="text-primary shrink-0" />
                    <span className="text-sm text-foreground/80 truncate flex-1">{uploadedFile.name}</span>
                    <button
                      onClick={clearFile}
                      disabled={generatingTree}
                      className="text-muted-foreground/60 hover:text-foreground/80 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={generatingTree}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-md border border-dashed border-border text-muted-foreground/60 hover:border-muted-foreground/40 hover:text-foreground/70 transition-colors text-sm"
                  >
                    <Upload size={14} />
                    Upload syllabus, notes, or PDF
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.markdown"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {treeError && (
                <p className="text-sm text-destructive">{treeError}</p>
              )}

              <Button
                onClick={handleSubjectNext}
                disabled={subjectName.trim().length < 3 || generatingTree}
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

        {/* ── Step 1: Study goal ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-xl">
                {t("onboarding.studyGoalTitle")}
              </CardTitle>
              <p className="text-sm text-muted-foreground/70">
                What are you working toward with <span className="text-primary font-medium">{subjectName}</span>?
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Generated goal chips */}
              {goalOptions.map((goal) => (
                <Button
                  key={goal}
                  variant="outline"
                  onClick={() => { setStudyGoal(goal); setGoalOther(false); }}
                  className={`w-full text-left justify-start py-4 ${
                    studyGoal === goal && !goalOther
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {goal}
                </Button>
              ))}

              {/* Other option */}
              <Button
                variant="outline"
                onClick={() => { setGoalOther(true); setStudyGoal(""); }}
                className={`w-full text-left justify-start py-4 ${
                  goalOther
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                Other — type my own goal
              </Button>

              {goalOther && (
                <Input
                  autoFocus
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.target.value)}
                  placeholder="e.g. Pass my resit, build a portfolio project…"
                  className="bg-surface-inset border-border text-foreground"
                />
              )}

              <Button
                onClick={() => setStep(2)}
                disabled={!studyGoal.trim()}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold mt-2"
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingContent />
    </Suspense>
  );
}
