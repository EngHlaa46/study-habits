"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check } from "lucide-react";
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
    <div className="bg-card/60 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-lg shadow-black/20 p-5 h-full flex flex-col">
      <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">
        {t("dashboard.todayNote")}
      </p>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {phrase ? (
            <motion.blockquote
              key="quote"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              className="text-foreground/90 text-sm leading-relaxed italic border-l-2 border-primary pl-3 mb-4"
            >
              {phrase}
            </motion.blockquote>
          ) : (
            <motion.div
              key="skeleton"
              className="h-10 bg-secondary rounded animate-pulse mb-4"
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-border pt-3">
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveAffirmation()}
                placeholder={t("dashboard.personalStatementPlaceholder")}
                maxLength={300}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-all"
              />
              <motion.button
                onClick={saveAffirmation}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9, rotate: 10 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors flex items-center gap-1"
              >
                <Check size={12} />
                {t("common.save")}
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={startEdit}
              whileHover="hovered"
              className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors text-left w-full flex items-start gap-2 group"
            >
              <span className="flex-1">
                {affirmation || (
                  <span className="italic">{t("dashboard.addPersonalStatement")}</span>
                )}
              </span>
              <motion.span
                variants={{ hovered: { rotate: -15, scale: 1.2 } }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0 mt-0.5"
              >
                <Pencil size={11} />
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
