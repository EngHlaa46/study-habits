"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Upload, X, FileText, FolderOpen } from "lucide-react";
import { useLanguage } from "@/lib/language";

const TOTAL_STEPS = 5; // 0=subject, 1=goal/hours, 2=challenges, 3=time, 4=event

function OnboardingContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const returning = searchParams.get("returning") === "true";

  const [step, setStep] = useState(0);

  // Step 0 — subject selection
  const [subjectName, setSubjectName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
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

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const allowed = ["pdf", "pptx", "txt", "md", "markdown"];
    const newFiles = Array.from(incoming).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return allowed.includes(ext);
    });
    setUploadedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const deduped = newFiles.filter((f) => !existingNames.has(f.name));
      const merged = [...prev, ...deduped];
      // Auto-fill subject name from first file if blank
      if (!subjectName.trim() && merged.length > 0) {
        const name = merged[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setSubjectName(name);
      }
      return merged;
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
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

      if (uploadedFiles.length > 0) {
        // Files uploaded — convert to MD + extract outline server-side
        const formData = new FormData();
        formData.append("name", subjectName.trim());
        for (const f of uploadedFiles) formData.append("files", f);
        res = await fetch("/api/materials", { method: "POST", body: formData });
      } else {
        // Subject name only — send as text
        res = await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: subjectName.trim(), name: subjectName.trim() }),
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

              {/* File / folder upload */}
              <div className="space-y-2">
                <Label className="text-foreground/80">
                  Course material{" "}
                  <span className="text-muted-foreground/50 font-normal">
                    (PDF, PPTX, TXT, MD — optional)
                  </span>
                </Label>

                {/* Drop zone / buttons */}
                <div
                  className="rounded-md border border-dashed border-border p-4 space-y-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addFiles(e.dataTransfer.files);
                  }}
                >
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={generatingTree}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-primary/80 transition-colors border border-border rounded px-2 py-1.5"
                    >
                      <Upload size={12} />
                      Add files
                    </button>
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      disabled={generatingTree}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-primary/80 transition-colors border border-border rounded px-2 py-1.5"
                    >
                      <FolderOpen size={12} />
                      Add folder
                    </button>
                    <span className="text-xs text-muted-foreground/40 self-center">
                      or drag & drop
                    </span>
                  </div>

                  {/* File list */}
                  {uploadedFiles.length > 0 && (
                    <ul className="space-y-1">
                      {uploadedFiles.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-foreground/70">
                          <FileText size={11} className="text-primary/60 shrink-0" />
                          <span className="truncate flex-1">{f.name}</span>
                          <span className="text-muted-foreground/40 shrink-0">
                            {(f.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            onClick={() => removeFile(i)}
                            disabled={generatingTree}
                            className="text-muted-foreground/40 hover:text-foreground/70 shrink-0"
                          >
                            <X size={11} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Hidden inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.pptx,.txt,.md,.markdown"
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-expect-error webkitdirectory is non-standard
                  webkitdirectory=""
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />

                {uploadedFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground/50">
                    {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} — outlines will be extracted and full content sent to the activity generator
                  </p>
                )}
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
                    {uploadedFiles.length > 0 ? "Converting files & building skill tree…" : "Building your skill tree…"}
                  </span>
                ) : (
                  "Build my plan →"
                )}
              </Button>

              {generatingTree && (
                <p className="text-xs text-center text-muted-foreground/50">
                  {uploadedFiles.length > 0
                    ? `Converting ${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""} to Markdown, extracting outline, mapping mastery paths…`
                    : "Analysing your subject and mapping mastery paths — takes about 20 seconds"}
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
