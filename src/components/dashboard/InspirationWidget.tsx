"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/language";

export function InspirationWidget() {
  const { t } = useLanguage();
  const [phrase, setPhrase] = useState<string | null>(null);
  const [affirmation, setAffirmation] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/inspiration")
      .then((r) => r.json())
      .then((data) => {
        if (data.text) setPhrase(data.text);
        if (data.affirmation) setAffirmation(data.affirmation);
      })
      .catch(() => {});
  }, []);

  function startEdit() {
    setDraft(affirmation);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function saveAffirmation() {
    setEditing(false);
    setAffirmation(draft);
    await fetch("/api/inspiration", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affirmation: draft }),
    }).catch(() => {});
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">
        {t("dashboard.todayNote")}
      </p>

      {phrase ? (
        <blockquote className="text-foreground/90 text-sm leading-relaxed italic border-l-2 border-primary pl-3 mb-4">
          {phrase}
        </blockquote>
      ) : (
        <div className="h-10 bg-secondary rounded animate-pulse mb-4" />
      )}

      <div className="border-t border-border pt-3">
        {editing ? (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveAffirmation()}
              placeholder="Your personal statement…"
              maxLength={300}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
            />
            <button
              onClick={saveAffirmation}
              className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
            >
              {t("common.save")}
            </button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors text-left w-full"
          >
            {affirmation || (
              <span className="italic">{t("dashboard.addPersonalStatement")}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
