"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";
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
    <div className="bg-card/60 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-lg shadow-black/20 p-5">
      <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">
        {t("dashboard.upcomingEvents")}
      </p>
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
    </div>
  );
}
