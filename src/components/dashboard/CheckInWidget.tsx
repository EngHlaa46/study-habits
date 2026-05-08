"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, X } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language";

interface CheckInWidgetProps {
  todayCompleted: boolean;
  recentCheckIns: {
    date: string;
    initiated: boolean;
    focusLevel: string | null;
  }[];
}

const focusColors: Record<string, string> = {
  none: "bg-gray-600",
  brief: "bg-yellow-500",
  focused: "bg-primary",
  deep: "bg-[#4ade80]",
};

const barContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const barItem = {
  hidden: { scaleY: 0, opacity: 0 },
  show: {
    scaleY: 1,
    opacity: 0.8,
    transition: { type: "spring" as const, stiffness: 320, damping: 24 },
  },
};

export function CheckInWidget({ todayCompleted, recentCheckIns }: CheckInWidgetProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-lg">{t("dashboard.dailyCheckIn")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayCompleted ? (
          <motion.div
            className="flex items-center gap-2 text-[#4ade80]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <CheckSquare size={18} />
            <span className="text-sm">{t("dashboard.completedToday")}</span>
          </motion.div>
        ) : (
          <Link href="/check-in">
            <Button className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold">
              {t("dashboard.startCheckIn")}
            </Button>
          </Link>
        )}

        <div>
          <p className="text-xs text-muted-foreground/70 mb-2">{t("dashboard.last7days")}</p>
          <motion.div
            className="flex gap-1"
            variants={barContainer}
            initial="hidden"
            animate="show"
          >
            {Array.from({ length: 7 }).map((_, i) => {
              const checkIn = recentCheckIns[6 - i];
              if (!checkIn) {
                return (
                  <motion.div
                    key={i}
                    variants={barItem}
                    style={{ transformOrigin: "bottom" }}
                    className="w-full h-8 rounded bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
                  >
                    <X size={10} className="text-muted-foreground/50" />
                  </motion.div>
                );
              }
              const color = checkIn.initiated
                ? focusColors[checkIn.focusLevel || "none"]
                : "bg-gray-700";
              return (
                <motion.div
                  key={i}
                  variants={barItem}
                  style={{ transformOrigin: "bottom" }}
                  className={`w-full h-8 rounded ${color}`}
                  title={`${checkIn.date}: ${checkIn.focusLevel || "no data"}`}
                />
              );
            })}
          </motion.div>
          <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
            <span>{t("dashboard.7dAgo")}</span>
            <span>{t("dashboard.today")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
