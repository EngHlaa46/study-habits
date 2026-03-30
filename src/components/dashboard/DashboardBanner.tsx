"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import { useLanguage } from "@/lib/language";

export function DashboardBanner() {
  const { t } = useLanguage();
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user/banner")
      .then((r) => r.json())
      .then((d) => setBannerUrl(d.bannerImageUrl ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editing) {
      setDraft(bannerUrl ?? "");
      inputRef.current?.focus();
    }
  }, [editing, bannerUrl]);

  const save = async () => {
    const url = draft.trim() || null;
    setSaving(true);
    await fetch("/api/user/banner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url }),
    });
    setBannerUrl(url);
    setSaving(false);
    setEditing(false);
  };

  const remove = async () => {
    setSaving(true);
    await fetch("/api/user/banner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: null }),
    });
    setBannerUrl(null);
    setSaving(false);
    setEditing(false);
  };

  if (!bannerUrl && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full mb-6 h-14 rounded-xl border border-dashed border-border text-muted-foreground/50 hover:text-muted-foreground hover:border-muted-foreground/50 text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <Pencil size={14} />
        {t("dashboard.addBannerPhoto")}
      </button>
    );
  }

  return (
    <div className="mb-6 relative">
      {bannerUrl && (
        <div
          className="w-full h-48 rounded-xl overflow-hidden relative"
          style={{ backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <button
            onClick={() => setEditing(true)}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <Pencil size={14} />
          </button>
        </div>
      )}

      {editing && (
        <div className="mt-2 flex gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder={t("dashboard.bannerUrlPlaceholder")}
            className="flex-1 bg-surface-inset border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
          />
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
          >
            <Check size={14} />
          </button>
          {bannerUrl && (
            <button
              onClick={remove}
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-xs hover:bg-secondary/80 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-2 rounded-lg text-muted-foreground/60 text-xs hover:text-muted-foreground"
          >
            {t("common.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
