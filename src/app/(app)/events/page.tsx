"use client";

import { useState, useEffect } from "react";
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

export default function EventsPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("exam");
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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
    fetchEvents();
  };

  const upcoming = events.filter((e) => e.status === "upcoming");
  const passed = events.filter((e) => e.status === "passed");

  if (loading) {
    return <div className="text-muted-foreground">{t("events.loadingEvents")}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("events.title")}</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary hover:bg-primary/80 text-primary-foreground"
        >
          <Plus size={16} className="mr-2" />
          {t("events.addEvent")}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border mb-6">
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

      {/* Upcoming events */}
      <h2 className="text-foreground text-lg font-semibold mb-3">{t("events.upcoming")}</h2>
      {upcoming.length === 0 ? (
        <p className="text-muted-foreground/70 text-sm mb-6">{t("events.noUpcoming")}</p>
      ) : (
        <div className="space-y-2 mb-6">
          {upcoming.map((event) => {
            const daysUntil = Math.ceil(
              (new Date(event.date).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            );
            return (
              <Card
                key={event.id}
                className="bg-card border-border"
              >
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={16} className="text-[#fbbf24]" />
                    <div>
                      <p className="text-foreground/80 text-sm font-medium">
                        {event.name}
                      </p>
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

      {/* Passed events */}
      {passed.length > 0 && (
        <>
          <h2 className="text-foreground text-lg font-semibold mb-3">{t("events.passed")}</h2>
          <div className="space-y-2 opacity-60">
            {passed.map((event) => (
              <Card
                key={event.id}
                className="bg-card border-border"
              >
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
