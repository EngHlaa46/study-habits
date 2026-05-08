"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface EventCardProps {
  events: {
    id: string;
    name: string;
    type: string;
    date: string;
    daysUntil: number;
  }[];
}

export function EventCard({ events }: EventCardProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-lg">{t("dashboard.upcomingEvents")}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground/70 text-sm">{t("dashboard.noUpcomingEvents")}</p>
        ) : (
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {events.map((event) => (
              <motion.div
                key={event.id}
                variants={staggerItem}
                className="flex items-center justify-between p-3 bg-white/[0.04] border border-white/[0.06] rounded-lg"
                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.06)" }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <div className="flex items-center gap-3">
                  <CalendarDays size={16} className="text-[#fbbf24]" />
                  <div>
                    <p className="text-foreground/80 text-sm font-medium">{event.name}</p>
                    <p className="text-muted-foreground/70 text-xs capitalize">{event.type}</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-mono ${
                    event.daysUntil <= 3
                      ? "text-red-400"
                      : event.daysUntil <= 7
                        ? "text-[#fbbf24]"
                        : "text-muted-foreground"
                  }`}
                >
                  <CountUp end={event.daysUntil} duration={1.2} suffix="d" />
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
