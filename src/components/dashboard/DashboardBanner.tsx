"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

  // Drag state (refs to avoid stale closures in listeners)
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 50, y: 50 });
  const pendingPosition = useRef("50% 50%");

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
    setPosition(pendingPosition.current = position);
    setRepositioning(false);
  };

  const parsePos = (pos: string): { x: number; y: number } => {
    const parts = pos.match(/(\d+)%\s+(\d+)%/);
    return parts ? { x: parseInt(parts[1]), y: parseInt(parts[2]) } : { x: 50, y: 50 };
  };

  const startDrag = useCallback((clientX: number, clientY: number) => {
    dragging.current = true;
    dragStartMouse.current = { x: clientX, y: clientY };
    dragStartPos.current = parsePos(pendingPosition.current);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!repositioning) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }, [repositioning, startDrag]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!repositioning) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, [repositioning, startDrag]);

  useEffect(() => {
    if (!repositioning) return;

    const applyDrag = (clientX: number, clientY: number) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = clientX - dragStartMouse.current.x;
      const dy = clientY - dragStartMouse.current.y;
      const newX = Math.round(Math.max(0, Math.min(100, dragStartPos.current.x - (dx / rect.width) * 100)));
      const newY = Math.round(Math.max(0, Math.min(100, dragStartPos.current.y - (dy / rect.height) * 100)));
      const pos = `${newX}% ${newY}%`;
      pendingPosition.current = pos;
      if (containerRef.current) {
        (containerRef.current as HTMLDivElement).style.backgroundPosition = pos;
      }
    };

    const onMouseMove = (e: MouseEvent) => applyDrag(e.clientX, e.clientY);
    const onMouseUp = () => { dragging.current = false; };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      applyDrag(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => { dragging.current = false; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [repositioning]);

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
          className={`w-full h-48 rounded-xl overflow-hidden relative select-none ${repositioning ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: position }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

          {repositioning ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/70 text-xs bg-black/40 rounded-lg px-3 py-1.5 select-none pointer-events-none">
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
