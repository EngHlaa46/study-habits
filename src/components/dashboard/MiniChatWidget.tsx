"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { useLanguage } from "@/lib/language";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MiniChatWidgetProps {
  initialMessages: Message[];
}

export function MiniChatWidget({ initialMessages }: MiniChatWidgetProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const { text: chunk } = JSON.parse(data);
            if (chunk) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + chunk,
                };
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="mt-6 bg-card border border-border rounded-xl flex flex-col" style={{ height: "300px" }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
        <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">{t("dashboard.coach")}</p>
        <Link href="/chat" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          {t("dashboard.openFullChat")}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-muted-foreground/50 text-sm text-center mt-4">
            {t("dashboard.askCoachAnything")}
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary/20 text-foreground"
                  : "bg-secondary text-foreground/90"
              }`}
            >
              {msg.content || (streaming && msg.role === "assistant" ? (
                <span className="inline-block w-4 h-3 bg-muted-foreground/40 rounded animate-pulse" />
              ) : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={t("dashboard.messageCoach")}
            disabled={streaming}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
