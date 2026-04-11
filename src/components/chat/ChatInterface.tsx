"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, BookOpen, Brain, Mic, MicOff } from "lucide-react";
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
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"study" | "training">("study");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const toggleVoice = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) setInput((prev) => prev ? prev + " " + transcript : transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);
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
              if (parsed.step && parsed.label) {
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
      <div className="flex items-start gap-3 mb-4 p-3 rounded-xl bg-secondary/40 border border-border">
        <button
          onClick={() => setChatMode("study")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
            chatMode === "study"
              ? "bg-primary/20 text-primary border-primary/40"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <BookOpen size={13} />
          Study
        </button>
        <button
          onClick={() => setChatMode("training")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
            chatMode === "training"
              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Brain size={13} />
          Training
        </button>
        <p className="text-xs text-muted-foreground/70 leading-relaxed pt-0.5">
          {chatMode === "study"
            ? "Ask anything — subject questions, planning help, concept explanations. Coach answers directly and suggests tools."
            : "Coach never gives the answer. Asks you questions so you think it through yourself. Use this to prepare for exams."}
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
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.askCoach")}
            className="bg-card border-border text-foreground resize-none min-h-[44px] max-h-[120px]"
            rows={1}
          />
          <button
            onClick={toggleVoice}
            title={listening ? "Stop recording" : "Voice input"}
            className={`px-3 rounded-lg border transition-colors ${
              listening
                ? "border-red-500/50 text-red-400 bg-red-500/10 animate-pulse"
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
