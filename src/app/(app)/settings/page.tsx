"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/language";

type CoachingStyle = "direct" | "socratic";
type MotivationalFrame = "intrinsic" | "exam";

const ACCENT_COLORS = [
  { hex: "#38bdf8", label: "Cyan", hsl: "199 89% 60%" },
  { hex: "#a855f7", label: "Purple", hsl: "270 91% 65%" },
  { hex: "#f97316", label: "Orange", hsl: "24 94% 53%" },
  { hex: "#fbbf24", label: "Amber", hsl: "43 96% 56%" },
  { hex: "#4ade80", label: "Green", hsl: "142 71% 65%" },
  { hex: "#fb7185", label: "Rose", hsl: "351 95% 71%" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [activeColor, setActiveColor] = useState<string>("#38bdf8");
  const [saving, setSaving] = useState(false);
  const [coachingStyle, setCoachingStyle] = useState<CoachingStyle>("direct");
  const [motivationalFrame, setMotivationalFrame] = useState<MotivationalFrame>("intrinsic");
  const [phoneHours, setPhoneHours] = useState<string>("");
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState("");
  const [savedCalendarUrl, setSavedCalendarUrl] = useState<string | null>(null);
  const [calendarLastSynced, setCalendarLastSynced] = useState<string | null>(null);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [calendarResult, setCalendarResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/theme-prefs")
      .then((r) => r.json())
      .then((prefs) => { if (prefs.accentColor) setActiveColor(prefs.accentColor); })
      .catch(() => {});
    fetch("/api/user/coaching-prefs")
      .then((r) => r.json())
      .then((prefs) => {
        if (prefs.coachingStyle) setCoachingStyle(prefs.coachingStyle);
        if (prefs.motivationalFrame) setMotivationalFrame(prefs.motivationalFrame);
        if (prefs.phoneUsageHours != null) setPhoneHours(String(prefs.phoneUsageHours));
        if (prefs.calendarFeedUrl) { setSavedCalendarUrl(prefs.calendarFeedUrl); setCalendarUrl(prefs.calendarFeedUrl); }
        if (prefs.calendarLastSynced) setCalendarLastSynced(prefs.calendarLastSynced);
      })
      .catch(() => {});
  }, []);

  async function saveCoachingPrefs() {
    setPrefsSaving(true);
    setPrefsSaved(false);
    const hours = parseFloat(phoneHours);
    await fetch("/api/user/coaching-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachingStyle,
        motivationalFrame,
        ...(phoneHours !== "" && !isNaN(hours) ? { phoneUsageHours: hours } : {}),
      }),
    }).finally(() => { setPrefsSaving(false); setPrefsSaved(true); });
  }

  async function syncCalendar() {
    setCalendarSyncing(true);
    setCalendarResult(null);
    setCalendarError(null);
    try {
      const res = await fetch("/api/events/sync-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: calendarUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setCalendarError(data.error || "Sync failed"); return; }
      setSavedCalendarUrl(calendarUrl);
      setCalendarLastSynced(new Date().toISOString());
      setCalendarResult({ imported: data.imported, skipped: data.skipped });
    } catch {
      setCalendarError("Network error — check your connection.");
    } finally {
      setCalendarSyncing(false);
    }
  }

  async function disconnectCalendar() {
    await fetch("/api/events/sync-calendar", { method: "DELETE" });
    setSavedCalendarUrl(null);
    setCalendarUrl("");
    setCalendarLastSynced(null);
    setCalendarResult(null);
  }

  async function applyColor(hex: string, hsl: string) {
    setActiveColor(hex);
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--ring", hsl);
    document.documentElement.style.setProperty("--chart-1", hsl);
    setSaving(true);
    await fetch("/api/user/theme-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accentColor: hex }),
    }).finally(() => setSaving(false));
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t("settings.title")}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t("settings.account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{t("settings.email")}</span>
            <span className="text-foreground/80 text-sm">
              {session?.user?.email}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{t("settings.name")}</span>
            <span className="text-foreground/80 text-sm">
              {session?.user?.name || t("settings.notSet")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t("settings.appearance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-muted-foreground text-sm mb-3">{t("settings.accentColor")}</p>
            <div className="flex gap-3 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  title={c.label}
                  onClick={() => applyColor(c.hex, c.hsl)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    activeColor === c.hex
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            {saving && <p className="text-muted-foreground text-xs mt-2">{t("settings.saving")}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t("settings.coachingPrefs")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-muted-foreground text-sm mb-2">{t("settings.coachingStyle")}</p>
            <div className="flex gap-3">
              {(["direct", "socratic"] as CoachingStyle[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setCoachingStyle(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    coachingStyle === s
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {s === "direct" ? t("settings.styleDirect") : t("settings.styleSocratic")}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-1.5">
              {coachingStyle === "direct" ? t("settings.styleDirectDesc") : t("settings.styleSocraticDesc")}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground text-sm mb-2">{t("settings.motivation")}</p>
            <div className="flex gap-3">
              {(["intrinsic", "exam"] as MotivationalFrame[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setMotivationalFrame(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    motivationalFrame === f
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {f === "intrinsic" ? t("settings.motivationIntrinsic") : t("settings.motivationExam")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-sm mb-2">{t("settings.phoneScreenTime")}</p>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={phoneHours}
              onChange={(e) => setPhoneHours(e.target.value)}
              placeholder="e.g. 4.5"
              className="w-28 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground/60 mt-1">{t("settings.phoneScreenTimeDesc")}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveCoachingPrefs}
              disabled={prefsSaving}
              className="px-4 py-2 rounded-lg bg-primary text-black text-sm font-medium hover:bg-primary/80 disabled:opacity-50 transition-colors"
            >
              {prefsSaving ? t("settings.saving") : t("settings.savePrefs")}
            </button>
            {prefsSaved && <span className="text-xs text-[#4ade80]">{t("settings.prefsSaved")}</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t("settings.calendarSync")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t("settings.calendarDesc")}{" "}
            <span className="text-foreground/80">Google Calendar</span>,{" "}
            <span className="text-foreground/80">Blackboard</span>,{" "}
            <span className="text-foreground/80">Canvas</span>{" "}
            {t("settings.calendarDescSuffix")}
          </p>

          <details className="text-xs text-muted-foreground/70 cursor-pointer">
            <summary className="hover:text-muted-foreground transition-colors">{t("settings.calendarHowToTitle")}</summary>
            <ul className="mt-2 space-y-1 pl-3 list-disc list-outside">
              <li>{t("settings.calendarGoogleHint")}</li>
              <li>{t("settings.calendarBlackboardHint")}</li>
              <li>{t("settings.calendarCanvasHint")}</li>
            </ul>
          </details>

          <div className="flex gap-2">
            <input
              type="url"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              placeholder={t("settings.calendarUrlPlaceholder")}
              className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/40"
            />
            <button
              onClick={syncCalendar}
              disabled={calendarSyncing || !calendarUrl.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-black text-sm font-medium hover:bg-primary/80 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {calendarSyncing ? t("settings.calendarSyncing") : savedCalendarUrl ? t("settings.calendarResync") : t("settings.calendarSyncBtn")}
            </button>
          </div>

          {calendarError && (
            <p className="text-xs text-red-400">{calendarError}</p>
          )}

          {calendarResult && (
            <p className="text-xs text-[#4ade80]">
              {t("settings.calendarImportedPre")} {calendarResult.imported}{" "}
              {calendarResult.imported !== 1 ? t("settings.calendarImportedEvents") : t("settings.calendarImportedEvent")}
              {calendarResult.skipped > 0 ? `, ${calendarResult.skipped} ${t("settings.calendarAlreadyExisted")}` : ""}.
            </p>
          )}

          {calendarLastSynced && (
            <p className="text-xs text-muted-foreground/60">
              {t("settings.calendarLastSynced")} {new Date(calendarLastSynced).toLocaleString()}
            </p>
          )}

          {savedCalendarUrl && (
            <button
              onClick={disconnectCalendar}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
            >
              {t("settings.calendarDisconnect")}
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t("settings.actions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator className="bg-border" />
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="border-red-900 text-red-400 hover:bg-red-900/20"
          >
            {t("settings.signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
