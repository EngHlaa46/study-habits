"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff, Sparkles, Wrench, ExternalLink, X, Plus } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { TOOLS } from "@/lib/tools-data";
import { useVoiceInput } from "@/hooks/useVoiceInput";

const STARTER_PROMPTS = [
  "How's my mastery looking?",
  "What should I practice next?",
  "Help me understand a concept",
  "Assign me a challenge",
];

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-secondary px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length === 0) return null;

        const allBullets = lines.every((l) => /^[-*]\s/.test(l));
        const allNumbered = lines.every((l) => /^\d+\.\s/.test(l));
        const someBullets = lines.some((l) => /^[-*]\s/.test(l));

        if (allBullets) {
          return (
            <ul key={i} className="space-y-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-primary shrink-0 mt-0.5">•</span>
                  <span>{renderInline(l.replace(/^[-*]\s/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (allNumbered) {
          return (
            <ol key={i} className="space-y-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{j + 1}.</span>
                  <span>{renderInline(l.replace(/^\d+\.\s/, ""))}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (someBullets) {
          return (
            <div key={i} className="space-y-1">
              {lines.map((l, j) =>
                /^[-*]\s/.test(l) ? (
                  <div key={j} className="flex gap-2">
                    <span className="text-primary shrink-0">•</span>
                    <span>{renderInline(l.replace(/^[-*]\s/, ""))}</span>
                  </div>
                ) : (
                  <p key={j}>{renderInline(l)}</p>
                )
              )}
            </div>
          );
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  initialMessages: Message[];
}

export function ChatInterface({ initialMessages }: ChatInterfaceProps) {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [taskToast, setTaskToast] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [suggestedTools, setSuggestedTools] = useState<string[]>([]);
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { listening, transcribing, toggle: toggleVoice } = useVoiceInput({
    getBase: () => input,
    onResult: (val) => setInput(val),
    lang,
  });

  // Debounced AI autocomplete
  const fetchSuggestion = useCallback((value: string, msgs: Message[]) => {
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    if (value.trim().split(/\s+/).length < 3) { setSuggestion(""); return; }
    suggestTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/chat/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: value,
            history: msgs.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const { suggestion: s } = await res.json();
        setSuggestion(s ?? "");
      } catch { setSuggestion(""); }
    }, 900);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSuggestion("");
    setStreaming(true);
    setPipelineStep("Initializing DCS pipeline...");

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error(t("chat.errorSend"));
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.action === "tool_suggestions" && parsed.tools) {
                  const keys = JSON.parse(parsed.tools) as string[];
                  setSuggestedTools(keys);
                  setToolsOpen(true);
                } else if (parsed.action === "task_updated" && parsed.task) {
                setTaskToast(parsed.task as string);
                setTimeout(() => setTaskToast(null), 5000);
              } else if (parsed.step && parsed.label) {
                setPipelineStep(parsed.label);
              } else if (parsed.text) {
                setPipelineStep(null);
                accumulated += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") {
                    last.content = accumulated;
                  }
                  return updated;
                });
              }
            } catch {
              // skip invalid JSON
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant" && !last.content) {
          last.content = t("chat.errorFallback");
        }
        return updated;
      });
    } finally {
      setStreaming(false);
      setPipelineStep(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-8rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-6">
            <div className="text-center text-muted-foreground/70">
              <p className="text-lg mb-1">{t("chat.aiStudyCoach")}</p>
              <p className="text-sm">{t("chat.coachDescription")}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-full text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground/80 border border-border"
                }`}
              >
                {msg.role === "assistant"
                  ? <MarkdownMessage content={msg.content} />
                  : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                }
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Task updated toast */}
      {taskToast && (
        <div className="flex items-center gap-2 py-2 px-3 mb-1 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/30 text-xs text-[#4ade80]">
          <span>✓</span>
          <span>Task updated: <span className="font-medium">{taskToast}</span></span>
        </div>
      )}

      {/* DCS pipeline status */}
      <AnimatePresence>
        {pipelineStep && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 py-2 text-xs text-muted-foreground/60"
          >
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="inline-block w-1.5 h-1.5 rounded-full bg-[#38bdf8]"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                />
              ))}
            </div>
            {pipelineStep}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tools panel */}
      {toolsOpen && (
        <div className="mb-3 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Study Tools</p>
            <button onClick={() => setToolsOpen(false)} className="text-muted-foreground/50 hover:text-muted-foreground">
              <X size={13} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {[...TOOLS].sort((a, b) => {
              const aS = suggestedTools.includes(a.key) ? 0 : 1;
              const bS = suggestedTools.includes(b.key) ? 0 : 1;
              return aS - bS;
            }).map((tool) => {
              const suggested = suggestedTools.includes(tool.key);
              return (
                <a
                  key={tool.key}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${
                    suggested
                      ? "bg-primary/[0.06] hover:bg-primary/[0.1]"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{tool.name}</span>
                    <span className="text-xs text-muted-foreground/60">{tool.badge}</span>
                    {suggested && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Suggested
                      </span>
                    )}
                  </div>
                  <ExternalLink size={12} className="text-muted-foreground/40 shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border pt-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setMessages([]); setInput(""); setSuggestion(""); }}
            title="New chat"
            className="px-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Plus size={16} />
          </button>
          <div className="flex-1 flex flex-col gap-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSuggestion("");
                fetchSuggestion(e.target.value, messages);
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab" && suggestion) {
                  e.preventDefault();
                  setInput((prev) => prev.trimEnd() + " " + suggestion);
                  setSuggestion("");
                  return;
                }
                handleKeyDown(e);
              }}
              placeholder={t("chat.askCoach")}
              className="bg-card border-border text-foreground resize-none min-h-[44px] max-h-[120px]"
              rows={1}
            />
            {suggestion && !streaming && (
              <button
                onClick={() => { setInput((prev) => prev.trimEnd() + " " + suggestion); setSuggestion(""); }}
                className="self-start flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Tab to accept"
              >
                <Sparkles size={10} className="text-primary" />
                <span className="text-muted-foreground/60 italic">{suggestion}</span>
                <span className="text-muted-foreground/40 text-[10px] ml-1">Tab</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setToolsOpen((v) => !v)}
            title="Study tools"
            className={`px-3 rounded-lg border transition-colors ${
              toolsOpen
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Wrench size={16} />
          </button>
          <button
            onClick={toggleVoice}
            disabled={transcribing}
            title={transcribing ? "Finalizing..." : listening ? "Stop recording (live transcription active)" : "Voice input (Whisper)"}
            className={`px-3 rounded-lg border transition-colors ${
              listening
                ? "border-red-500/50 text-red-400 bg-red-500/10 animate-pulse"
                : transcribing
                  ? "border-primary/40 text-primary/60 bg-primary/5 animate-pulse"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <Button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="bg-primary hover:bg-primary/80 text-primary-foreground px-4"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
