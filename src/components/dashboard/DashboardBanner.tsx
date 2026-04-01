"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X, Check, Move } from "lucide-react";
import { useLanguage } from "@/lib/language";

export function DashboardBanner() {
  const { t } = useLanguage();
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [position, setPosition] = useState("50% 50%");
  const [editing, setEditing] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 50, y: 50 });
  const pendingPosition = useRef("50% 50%");
  const repositioningRef = useRef(false);

  // Keep ref in sync with state so event listeners always see current value
  useEffect(() => {
    repositioningRef.current = repositioning;
  }, [repositioning]);

  useEffect(() => {
    fetch("/api/user/banner")
      .then((r) => r.json())
      .then((d) => {
        setBannerUrl(d.bannerImageUrl ?? null);
        setPosition(d.bannerPosition ?? "50% 50%");
        pendingPosition.current = d.bannerPosition ?? "50% 50%";
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editing) {
      setDraft(bannerUrl ?? "");
      inputRef.current?.focus();
    }
  }, [editing, bannerUrl]);

  const parsePos = (pos: string) => {
    const parts = pos.match(/(\d+)%\s+(\d+)%/);
    return parts ? { x: parseInt(parts[1]), y: parseInt(parts[2]) } : { x: 50, y: 50 };
  };

  const applyDrag = (clientX: number, clientY: number) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    const newX = Math.round(Math.max(0, Math.min(100, posStart.current.x - (dx / rect.width) * 100)));
    const newY = Math.round(Math.max(0, Math.min(100, posStart.current.y - (dy / rect.height) * 100)));
    const pos = `${newX}% ${newY}%`;
    pendingPosition.current = pos;
    containerRef.current.style.backgroundPosition = pos;
  };

  // Attach drag listeners directly to the element so we can use passive:false on touchstart
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!repositioningRef.current) return;
      e.preventDefault();
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = parsePos(pendingPosition.current);
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      applyDrag(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      dragging.current = false;
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: false });
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, []); // attach once — reads repositioningRef for current state

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

  const savePosition = async () => {
    setSaving(true);
    await fetch("/api/user/banner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: pendingPosition.current }),
    });
    setPosition(pendingPosition.current);
    setSaving(false);
    setRepositioning(false);
  };

  const cancelReposition = () => {
    pendingPosition.current = position;
    if (containerRef.current) containerRef.current.style.backgroundPosition = position;
    setRepositioning(false);
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
          ref={containerRef}
          className={`w-full h-48 rounded-xl overflow-hidden relative select-none touch-none ${repositioning ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: position }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

          {repositioning ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-white/70 text-xs bg-black/40 rounded-lg px-3 py-1.5 select-none">
                {t("dashboard.dragToReposition")}
              </p>
            </div>
          ) : (
            <div className="absolute top-3 right-3 flex gap-1.5">
              <button
                onClick={() => {
                  pendingPosition.current = position;
                  setRepositioning(true);
                }}
                className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors"
                title={t("dashboard.repositionBanner")}
              >
                <Move size={14} />
              </button>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {repositioning && (
        <div className="mt-2 flex gap-2 justify-end">
          <button
            onClick={cancelReposition}
            className="px-3 py-2 rounded-lg text-muted-foreground/60 text-xs hover:text-muted-foreground"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={savePosition}
            disabled={saving}
            className="px-3 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors flex items-center gap-1.5"
          >
            <Check size={13} />
            {t("dashboard.savePosition")}
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
