"use client";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useLanguage } from "@/lib/language";

export function FeedbackButton() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setSending(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }).catch(() => {});
    setSending(false);
    setSent(true);
    setMessage("");
    setTimeout(() => { setOpen(false); setSent(false); }, 1500);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-colors"
      >
        <MessageCircle size={18} />
        <span className="text-sm font-medium">{t("feedback.button")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-foreground font-semibold">{t("feedback.title")}</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground/60 hover:text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground/70">{t("feedback.description")}</p>
              {sent ? (
                <p className="text-center text-sm text-[#4ade80] py-4">{t("feedback.sent")}</p>
              ) : (
                <>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("feedback.placeholder")}
                    rows={4}
                    maxLength={2000}
                    className="w-full bg-surface-inset border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none"
                  />
                  <button
                    onClick={submit}
                    disabled={sending || !message.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/20 text-primary font-medium text-sm hover:bg-primary/30 transition-colors disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sending ? t("feedback.sending") : t("feedback.submit")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
