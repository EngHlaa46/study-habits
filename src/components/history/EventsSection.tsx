"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/language";

interface Event {
  id: string;
  name: string;
  type: string;
  date: string;
  status: string;
  notes: string | null;
}

interface EventsSectionProps {
  initialEvents: Event[];
}

export function EventsSection({ initialEvents }: EventsSectionProps) {
  const { t } = useLanguage();
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("exam");

  const fetchEvents = async () => {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data.events || []);
  };

  const handleAdd = async () => {
    if (!name || !date) return;
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, type }),
    });
    setName("");
    setDate("");
    setShowForm(false);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const upcoming = events.filter((e) => e.status === "upcoming");
  const passed = events.filter((e) => e.status === "passed");

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">{t("events.title")}</h2>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className="bg-primary hover:bg-primary/80 text-primary-foreground"
        >
          <Plus size={14} className="mr-1.5" />
          {t("events.addEvent")}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground/80">{t("events.eventName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("events.namePlaceholder")}
                className="bg-surface-inset border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground/80">{t("events.date")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-surface-inset border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground/80">{t("events.type")}</Label>
              <div className="flex flex-wrap gap-2">
                {["exam", "quiz", "deadline", "project", "other"].map((v) => (
                  <Button
                    key={v}
                    variant="outline"
                    size="sm"
                    onClick={() => setType(v)}
                    className={`capitalize ${
                      type === v
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                className="bg-primary hover:bg-primary/80 text-primary-foreground"
              >
                {t("events.add")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="text-muted-foreground"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {upcoming.length === 0 ? (
        <p className="text-muted-foreground/60 text-sm mb-4">{t("events.noUpcoming")}</p>
      ) : (
        <div className="space-y-2 mb-6">
          {upcoming.map((event) => {
            const daysUntil = Math.ceil(
              (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return (
              <Card key={event.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={16} className="text-[#fbbf24]" />
                    <div>
                      <p className="text-foreground/80 text-sm font-medium">{event.name}</p>
                      <p className="text-muted-foreground/70 text-xs">
                        {new Date(event.date).toLocaleDateString()} &middot;{" "}
                        <span className="capitalize">{event.type}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-mono ${
                        daysUntil <= 3
                          ? "text-red-400"
                          : daysUntil <= 7
                          ? "text-[#fbbf24]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {daysUntil}d
                    </span>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-muted-foreground/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Passed */}
      {passed.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("events.passed")}</h3>
          <div className="space-y-2 opacity-60">
            {passed.map((event) => (
              <Card key={event.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={16} className="text-muted-foreground/60" />
                    <div>
                      <p className="text-muted-foreground text-sm">{event.name}</p>
                      <p className="text-muted-foreground/60 text-xs">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-muted-foreground/60 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
