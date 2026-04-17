"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language";

interface CalendarSyncSectionProps {
  initialFeedUrl: string | null;
  initialLastSynced: string | null;
}

export function CalendarSyncSection({ initialFeedUrl, initialLastSynced }: CalendarSyncSectionProps) {
  const { t } = useLanguage();
  const [calendarUrl, setCalendarUrl] = useState(initialFeedUrl ?? "");
  const [savedCalendarUrl, setSavedCalendarUrl] = useState(initialFeedUrl);
  const [calendarLastSynced, setCalendarLastSynced] = useState(initialLastSynced);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [calendarResult, setCalendarResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);

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

  return (
    <div className="mt-10 pt-8 border-t border-border">
      <h2 className="text-lg font-semibold text-foreground mb-1">{t("settings.calendarSync")}</h2>
      <p className="text-muted-foreground text-sm mb-4">
        {t("settings.calendarDesc")}{" "}
        <span className="text-foreground/80">Google Calendar</span>,{" "}
        <span className="text-foreground/80">Blackboard</span>,{" "}
        <span className="text-foreground/80">Canvas</span>{" "}
        {t("settings.calendarDescSuffix")}
      </p>

      <details className="text-xs text-muted-foreground/70 cursor-pointer mb-4">
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
          {calendarSyncing
            ? t("settings.calendarSyncing")
            : savedCalendarUrl
            ? t("settings.calendarResync")
            : t("settings.calendarSyncBtn")}
        </button>
      </div>

      {calendarError && <p className="text-xs text-red-400 mt-2">{calendarError}</p>}

      {calendarResult && (
        <p className="text-xs text-[#4ade80] mt-2">
          {t("settings.calendarImportedPre")} {calendarResult.imported}{" "}
          {calendarResult.imported !== 1
            ? t("settings.calendarImportedEvents")
            : t("settings.calendarImportedEvent")}
          {calendarResult.skipped > 0
            ? `, ${calendarResult.skipped} ${t("settings.calendarAlreadyExisted")}`
            : ""}.
        </p>
      )}

      {calendarLastSynced && (
        <p className="text-xs text-muted-foreground/60 mt-2">
          {t("settings.calendarLastSynced")} {new Date(calendarLastSynced).toLocaleString()}
        </p>
      )}

      {savedCalendarUrl && (
        <button
          onClick={disconnectCalendar}
          className="text-xs text-red-400/70 hover:text-red-400 transition-colors mt-2 block"
        >
          {t("settings.calendarDisconnect")}
        </button>
      )}
    </div>
  );
}
