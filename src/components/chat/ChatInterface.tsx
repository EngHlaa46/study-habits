"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, BookOpen, Brain, Mic, MicOff, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/language";

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
  const [chatMode, setChatMode] = useState<"skills" | "study" | "training">("skills");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [taskToast, setTaskToast] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const toggleVoice = useCallback(async () => {
    if (listening) {
      mediaRecorderRef.current?.stop();
      setListening(false);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return; // mic permission denied
    }

    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      audioChunksRef.current = [];
      setTranscribing(true);
      try {
        const fd = new FormData();
        fd.append("audio", blob, "recording.webm");
        fd.append("lang", lang === "ar" ? "ar" : "en");
        const res = await fetch("/api/chat/transcribe", { method: "POST", body: fd });
        const { transcript } = await res.json();
        if (transcript) {
          setInput((prev) => (prev.trimEnd() ? prev.trimEnd() + " " + transcript.trim() : transcript.trim()));
        }
      } catch { /* ignore */ } finally {
        setTranscribing(false);
      }
    };

    recorder.start();
    setListening(true);
  }, [listening, lang]);
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
        body: JSON.stringify({ message: text, chatMode }),
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
              if (parsed.action === "task_updated" && parsed.task) {
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
      {/* Mode toggle */}
      <div className="mb-4 p-3 rounded-xl bg-secondary/40 border border-border space-y-2">
        <div className="flex items-center gap-2">
          {/* Skills Coach — primary/default */}
          <button
            onClick={() => setChatMode("skills")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
              chatMode === "skills"
                ? "bg-primary/20 text-primary border-primary/40"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Sparkles size={14} />
            Skills Coach
          </button>

          <span className="text-muted-foreground/30 text-xs">|</span>

          {/* Study & Training — secondary */}
          <button
            onClick={() => setChatMode("study")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              chatMode === "study"
                ? "bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/40"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <BookOpen size={12} />
            Study
          </button>
          <button
            onClick={() => setChatMode("training")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              chatMode === "training"
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Brain size={12} />
            Training
          </button>
        </div>

        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          {chatMode === "skills" && "Skill building, habit coaching, check-in reviews, and planning. This is the core of the app."}
          {chatMode === "study" && "Ask subject questions — math, science, history, anything. Coach answers directly and suggests tools."}
          {chatMode === "training" && "Socratic exam prep. Coach never gives the answer — asks you questions until you work it out yourself."}
        </p>
      </div>

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
            onClick={toggleVoice}
            disabled={transcribing}
            title={transcribing ? "Transcribing..." : listening ? "Stop recording" : "Voice input (Whisper)"}
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
