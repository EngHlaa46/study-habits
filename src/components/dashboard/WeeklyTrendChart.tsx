"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useLanguage } from "@/lib/language";

interface CheckInData {
  date: string;
  initiated: boolean;
  focusLevel: string | null;
}

interface WeeklyTrendChartProps {
  checkIns: CheckInData[];
}

const focusToValue: Record<string, number> = {
  none: 1,
  brief: 2,
  focused: 3,
  deep: 4,
};

function buildFocusToColor(accentColor: string): Record<number, string> {
  return {
    0: "#1f1f2e",
    1: "#6b7280",
    2: "#eab308",
    3: accentColor,
    4: "#4ade80",
  };
}

function CustomTooltip({
  active,
  payload,
  labels,
  didNotStudy,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number; initiated: boolean } }>;
  labels: Record<number, string>;
  didNotStudy: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-foreground/80 font-medium">{data.label}</p>
      <p className="text-muted-foreground/70">
        {data.initiated ? labels[data.value] : didNotStudy}
      </p>
    </div>
  );
}

export function WeeklyTrendChart({ checkIns }: WeeklyTrendChartProps) {
  const { t, lang } = useLanguage();

  const primaryHsl = typeof window !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
    : "199 89% 60%";
  const accentColor = `hsl(${primaryHsl})`;
  const focusToColor = buildFocusToColor(accentColor);

  const focusLabels: Record<number, string> = {
    0: t("checkin.focus.noCheckIn"),
    1: t("checkin.focus.none"),
    2: t("checkin.focus.brief"),
    3: t("checkin.focus.focused"),
    4: t("checkin.focus.deep"),
  };

  const locale = lang === "ar" ? "ar-SA" : "en-US";

  const data = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const ci = checkIns.find((c) => c.date === dateStr);

    const dayLabel = d.toLocaleDateString(locale, { weekday: "short" });
    const dateLabel = d.toLocaleDateString(locale, { month: "short", day: "numeric" });

    if (ci && ci.initiated) {
      data.push({ day: dayLabel, label: dateLabel, value: focusToValue[ci.focusLevel || "none"] || 1, initiated: true });
    } else if (ci) {
      data.push({ day: dayLabel, label: dateLabel, value: 1, initiated: false });
    } else {
      data.push({ day: dayLabel, label: dateLabel, value: 0, initiated: false });
    }
  }

  const legend = [
    { labelKey: "checkin.focus.brief", color: "#eab308" },
    { labelKey: "checkin.focus.focused", color: accentColor },
    { labelKey: "checkin.focus.deep", color: "#4ade80" },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-lg">{t("dashboard.weeklyTrend")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                interval={1}
              />
              <YAxis hide domain={[0, 4]} />
              <Tooltip
                content={<CustomTooltip labels={focusLabels} didNotStudy={t("checkin.didNotStudy")} />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={focusToColor[entry.value]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-3">
          {legend.map((item) => (
            <div key={item.labelKey} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground/70 text-xs">{t(item.labelKey)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
