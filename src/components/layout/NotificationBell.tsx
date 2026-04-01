"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { subscribeToPush, unsubscribeFromPush, getPushState } from "@/components/providers/PushProvider";

interface Notification {
  id: string;
  content: string;
  createdAt: string;
}

export function NotificationBell() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<"unsupported" | "denied" | "subscribed" | "unsubscribed">("unsubscribed");
  const [pushLoading, setPushLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    getPushState().then(setPushState);
  }, []);

  // Refresh whenever the popover opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
      getPushState().then(setPushState);
    }
  }, [open]);

  const togglePush = async () => {
    setPushLoading(true);
    if (pushState === "subscribed") {
      await unsubscribeFromPush();
    } else {
      await subscribeToPush();
    }
    setPushState(await getPushState());
    setPushLoading(false);
  };

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const dismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-colors"
      >
        <div className="relative">
          <Bell size={18} />
          {notifications.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </div>
        <span className="text-sm font-medium">{t("notifications.title")}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">{t("notifications.title")}</p>
          </div>
          {notifications.length === 0 ? (
            <p className="text-muted-foreground/60 text-sm text-center py-6">
              {t("notifications.allCaughtUp")}
            </p>
          ) : (
            <ul className="max-h-60 overflow-y-auto divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                  <p className="text-sm text-foreground/80 flex-1 leading-snug">
                    {n.content}
                  </p>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 mt-0.5"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pushState !== "unsupported" && (
            <div className="px-4 py-3 border-t border-border">
              {pushState === "denied" ? (
                <p className="text-xs text-muted-foreground/50">{t("notifications.pushDenied")}</p>
              ) : (
                <button
                  onClick={togglePush}
                  disabled={pushLoading}
                  className="flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors w-full"
                >
                  <Smartphone size={13} className={pushState === "subscribed" ? "text-primary" : ""} />
                  {pushLoading
                    ? t("notifications.pushLoading")
                    : pushState === "subscribed"
                    ? t("notifications.pushDisable")
                    : t("notifications.pushEnable")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
