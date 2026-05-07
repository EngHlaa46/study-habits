"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff, Sparkles, Wrench, ExternalLink, X } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { TOOLS } from "@/lib/tools-data";
import { useVoiceInput } from "@/hooks/useVoiceInput";

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
        body: JSON.stringify({ message: text, chatMode: "skills" }),
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
          <div className="text-center text-muted-foreground/70 mt-20">
            <p className="text-lg mb-2">{t("chat.aiStudyCoach")}</p>
            <p className="text-sm">
              {t("chat.coachDescription")}
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground/80 border border-border"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
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
      {pipelineStep && (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground/60">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
          {pipelineStep}
        </div>
      )}

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
