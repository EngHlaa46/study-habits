"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, X, Timer } from "lucide-react";
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

export function CheckInWidget({
  todayCompleted,
  recentCheckIns,
}: CheckInWidgetProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-lg">{t("dashboard.dailyCheckIn")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayCompleted ? (
          <div className="flex items-center gap-2 text-[#4ade80]">
            <CheckSquare size={18} />
            <span className="text-sm">{t("dashboard.completedToday")}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Link href="/check-in">
              <Button className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold">
                {t("dashboard.startCheckIn")}
              </Button>
            </Link>
            <Link href="/session">
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:border-primary/50 hover:text-primary gap-2"
              >
                <Timer size={15} />
                Start Session
              </Button>
            </Link>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground/70 mb-2">{t("dashboard.last7days")}</p>
          <div className="flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => {
              const checkIn = recentCheckIns[6 - i];
              if (!checkIn) {
                return (
                  <div
                    key={i}
                    className="w-full h-8 rounded bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
                  >
                    <X size={10} className="text-muted-foreground/50" />
                  </div>
                );
              }
              const color = checkIn.initiated
                ? focusColors[checkIn.focusLevel || "none"]
                : "bg-gray-700";
              return (
                <div
                  key={i}
                  className={`w-full h-8 rounded ${color} opacity-80`}
                  title={`${checkIn.date}: ${checkIn.focusLevel || "no data"}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
            <span>{t("dashboard.7dAgo")}</span>
            <span>{t("dashboard.today")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
