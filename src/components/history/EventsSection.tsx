"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Event {
  id: string;
  name: string;
  type: string;
  date: string;
  status: string;
  notes: string | null;
  examContent: string | null;
}

interface ReadinessResult {
  score: number;
  summary: string;
  topics: { topic: string; readiness: number; note: string }[];
}

interface Props {
  initialEvents: Event[];
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  exam:     { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30",    dot: "bg-red-400" },
  quiz:     { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/30",  dot: "bg-amber-400" },
  deadline: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-400" },
  project:  { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
  other:    { bg: "bg-secondary",     text: "text-muted-foreground", border: "border-border",  dot: "bg-muted-foreground/50" },
};

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr + "T12:00:00").getTime() - Date.now()) / 86400000);
}

function countdownLabel(days: number): string {
  if (days < 0) return "Passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d`;
}

function countdownColor(days: number): string {
  if (days < 0) return "text-muted-foreground/40";
  if (days <= 3) return "text-red-400";
  if (days <= 7) return "text-amber-400";
  return "text-muted-foreground";
}

function scoreColor(score: number): string {
  if (score >= 0.7) return "#4ade80";
  if (score >= 0.4) return "#fbbf24";
  return "#f87171";
}

export function EventsSection({ initialEvents }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [topicEdits, setTopicEdits] = useState<Record<string, string>>({});
  const [readiness, setReadiness] = useState<Record<string, ReadinessResult>>({});
  const [readinessLoading, setReadinessLoading] = useState<Record<string, boolean>>({});

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState("exam");
  const [addNotes, setAddNotes] = useState("");
  const [addTopics, setAddTopics] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const eventsByDate = new Map<string, Event[]>();
  for (const e of events) {
    const key = e.date;
    eventsByDate.set(key, [...(eventsByDate.get(key) ?? []), e]);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  function openAdd(date?: string) {
    setAddDate(date ?? "");
    setAddName(""); setAddType("exam"); setAddNotes(""); setAddTopics("");
    setShowAdd(true);
  }

  async function handleAdd() {
    if (!addName.trim() || !addDate) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), date: addDate, type: addType, notes: addNotes || null, examContent: addTopics || null }),
      });
      const data = await res.json();
      if (res.ok && data.event) {
        const e = data.event;
        setEvents((prev) => [...prev, { id: e.id, name: e.name, type: e.type, date: e.date.split("T")[0], status: e.status, notes: e.notes, examContent: e.examContent }].sort((a, b) => a.date.localeCompare(b.date)));
        setShowAdd(false);
      }
    } finally {
      setAddSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function toggleExpand(event: Event) {
    if (expandedId === event.id) { setExpandedId(null); return; }
    setExpandedId(event.id);
    if (!(event.id in topicEdits)) {
      setTopicEdits((prev) => ({ ...prev, [event.id]: event.examContent ?? "" }));
    }
  }

  async function evaluateReadiness(event: Event) {
    const content = topicEdits[event.id] ?? "";
    if (content !== event.examContent) {
      await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, examContent: content }),
      });
      setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, examContent: content } : e));
    }
    setReadinessLoading((prev) => ({ ...prev, [event.id]: true }));
    try {
      const res = await fetch("/api/events/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      });
      const data = await res.json();
      if (res.ok) setReadiness((prev) => ({ ...prev, [event.id]: data }));
    } finally {
      setReadinessLoading((prev) => ({ ...prev, [event.id]: false }));
    }
  }

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-6">
      {/* Calendar card */}
      <div className="bg-card border border-border rounded-xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDate(null); }}
              className="text-muted-foreground hover:text-foreground p-1 rounded">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-foreground min-w-[130px] text-center">{monthLabel}</span>
            <button onClick={() => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDate(null); }}
              className="text-muted-foreground hover:text-foreground p-1 rounded">
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={() => openAdd()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <Plus size={13} /> Add event
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[10px] text-muted-foreground/50 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}`}
            className="grid grid-cols-7 gap-1"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const isSelected = dateStr === selectedDate;
              const isPast = dateStr < todayStr;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`flex flex-col items-center justify-start pt-1.5 pb-1 rounded-lg min-h-[48px] transition-all text-xs font-medium
                    ${isSelected ? "bg-primary/15 ring-1 ring-primary/50" : isToday ? "ring-1 ring-primary/40" : "hover:bg-secondary/60"}
                    ${isPast && !isToday ? "opacity-50" : ""}
                  `}
                >
                  <span className={`text-xs ${isToday ? "text-primary font-bold" : isFuture ? "text-foreground/80" : "text-muted-foreground/60"}`}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-[2px] mt-1 px-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[e.type]?.dot ?? "bg-primary"}`} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[8px] text-muted-foreground/50">+{dayEvents.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border">
          {Object.entries(TYPE_COLORS).map(([type, c]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${c.dot}`} />
              <span className="text-[10px] text-muted-foreground/60 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <button
                onClick={() => openAdd(selectedDate)}
                className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {selectedEvents.length === 0 && (
              <p className="text-sm text-muted-foreground/50">No events — click Add to create one.</p>
            )}

            {selectedEvents.map((event) => {
              const c = TYPE_COLORS[event.type] ?? TYPE_COLORS.other;
              const days = daysUntil(event.date);
              const isExpanded = expandedId === event.id;
              const topics = topicEdits[event.id] ?? event.examContent ?? "";
              const result = readiness[event.id];
              const loading = readinessLoading[event.id] ?? false;
              const canEvaluate = (event.type === "exam" || event.type === "quiz");


              return (
                <div key={event.id} className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
                  {/* Event header */}
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${c.border} ${c.text} shrink-0 capitalize`}>
                        {event.type}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">{event.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-mono font-semibold ${countdownColor(days)}`}>
                        {countdownLabel(days)}
                      </span>
                      {canEvaluate && (
                        <button
                          onClick={() => {
                            toggleExpand(event);
                          }}
                          className="text-muted-foreground/60 hover:text-foreground transition-colors"
                          title="Topics & readiness"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      <button onClick={() => handleDelete(event.id)} className="text-muted-foreground/40 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Exam topics + readiness */}
                  <AnimatePresence>
                    {isExpanded && canEvaluate && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.06]">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground/70">Topics & content in this {event.type}</Label>
                            <textarea
                              value={topics}
                              onChange={(e) => setTopicEdits((prev) => ({ ...prev, [event.id]: e.target.value }))}
                              placeholder={"e.g.\n- Integration by parts\n- Limits and continuity\n- Chain rule"}
                              rows={4}
                              className="w-full text-xs bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-foreground/80 placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                          </div>

                          <button
                            onClick={() => evaluateReadiness(event)}
                            disabled={loading || !topics.trim()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black text-xs font-semibold hover:bg-primary/80 disabled:opacity-40 transition-colors"
                          >
                            {loading ? <><Loader2 size={12} className="animate-spin" /> Evaluating…</> : "How ready am I? →"}
                          </button>

                          {/* Readiness result */}
                          {result && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-3 pt-1"
                            >
                              {/* Score bar */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground/60">Readiness</span>
                                  <span className="text-sm font-bold" style={{ color: scoreColor(result.score) }}>
                                    {Math.round(result.score * 100)}%
                                  </span>
                                </div>
                                <div className="w-full bg-black/20 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.round(result.score * 100)}%`, backgroundColor: scoreColor(result.score) }}
                                  />
                                </div>
                              </div>

                              {/* Summary */}
                              <p className="text-xs text-foreground/80 leading-relaxed">{result.summary}</p>

                              {/* Topic breakdown */}
                              {result.topics?.length > 0 && (
                                <div className="space-y-1.5">
                                  {result.topics.map((t, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <div className="w-full bg-black/20 rounded-full h-1.5 mt-1.5 shrink-0" style={{ maxWidth: "60px" }}>
                                        <div
                                          className="h-1.5 rounded-full"
                                          style={{ width: `${Math.round(t.readiness * 100)}%`, backgroundColor: scoreColor(t.readiness) }}
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="text-[11px] font-medium text-foreground/80">{t.topic}</span>
                                        {t.note && <span className="text-[10px] text-muted-foreground/60 ml-1.5">{t.note}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add event form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="bg-card border border-border rounded-xl p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-foreground">New event</h3>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground/70">Event name</Label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Calculus Final Exam" className="bg-secondary border-border text-foreground text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground/70">Date</Label>
                <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="bg-secondary border-border text-foreground text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground/70">Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {["exam", "quiz", "deadline", "project"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAddType(v)}
                      className={`text-xs px-2 py-1 rounded-full border capitalize transition-colors ${addType === v ? `${TYPE_COLORS[v].bg} ${TYPE_COLORS[v].text} ${TYPE_COLORS[v].border}` : "border-border text-muted-foreground hover:border-muted-foreground"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {(addType === "exam" || addType === "quiz") && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground/70">Topics covered <span className="text-muted-foreground/40">(for readiness check)</span></Label>
                <textarea
                  value={addTopics}
                  onChange={(e) => setAddTopics(e.target.value)}
                  placeholder={"e.g.\n- Integration by parts\n- Limits and continuity"}
                  rows={3}
                  className="w-full text-sm bg-secondary border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={!addName.trim() || !addDate || addSaving} className="bg-primary hover:bg-primary/80 text-black text-sm font-semibold">
                {addSaving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-muted-foreground text-sm">Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming list (passed events hidden by default) */}
      {events.filter((e) => e.status === "upcoming").length > 0 && !selectedDate && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground/50 uppercase tracking-widest">All upcoming</p>
          {events.filter((e) => e.status === "upcoming").map((event) => {
            const c = TYPE_COLORS[event.type] ?? TYPE_COLORS.other;
            const days = daysUntil(event.date);
            return (
              <button
                key={event.id}
                onClick={() => setSelectedDate(event.date)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${c.border} ${c.bg} hover:opacity-90 transition-opacity text-left`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-semibold capitalize ${c.text} shrink-0`}>{event.type}</span>
                  <span className="text-sm text-foreground/80 truncate">{event.name}</span>
                </div>
                <span className={`text-xs font-mono font-semibold shrink-0 ml-3 ${countdownColor(days)}`}>{countdownLabel(days)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
