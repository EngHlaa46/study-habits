"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Smartphone, Download } from "lucide-react";
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
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt?: () => Promise<void> } | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
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

    // PWA install prompt (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as Event & { prompt?: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Detect if already installed
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);

    // iOS Safari detection (no beforeinstallprompt, needs manual instructions)
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as Record<string, unknown>).MSStream;
    setIsIOS(ios && !window.matchMedia("(display-mode: standalone)").matches);

    return () => window.removeEventListener("beforeinstallprompt", handler);
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
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-colors"
      >
        <div className="relative">
          <motion.div
            animate={notifications.length > 0 && !open ? {
              rotate: [0, -12, 10, -8, 6, -4, 0],
            } : {}}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            <Bell size={18} />
          </motion.div>
          <AnimatePresence>
            {notifications.length > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
              >
                {notifications.length > 9 ? "9+" : notifications.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <span className="text-sm font-medium">{t("notifications.title")}</span>
      </motion.button>

      <AnimatePresence>
      {open && (
        <motion.div
          key="popover"
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
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

          {/* PWA install — Chrome/Android */}
          {!isInstalled && installPrompt && (
            <div className="px-4 py-3 border-t border-border">
              <button
                onClick={async () => {
                  if (installPrompt.prompt) {
                    await installPrompt.prompt();
                    setInstallPrompt(null);
                    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);
                  }
                }}
                className="flex items-center gap-2 text-xs text-primary/80 hover:text-primary transition-colors w-full"
              >
                <Download size={13} />
                Add to Home Screen
              </button>
            </div>
          )}

          {/* PWA install — iOS Safari (manual instructions) */}
          {isIOS && !isInstalled && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                <span className="text-primary/80">Install on iOS:</span> tap the Share button
                {" "}(<span className="font-mono">⎙</span>){" "}
                then <span className="text-foreground/70">&ldquo;Add to Home Screen&rdquo;</span>
              </p>
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
