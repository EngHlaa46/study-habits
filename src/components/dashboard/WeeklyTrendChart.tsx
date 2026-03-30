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

// focusToColor is built at render time so it picks up the current --primary value
function buildFocusToColor(accentColor: string): Record<number, string> {
  return {
    0: "#1f1f2e",
    1: "#6b7280",
    2: "#eab308",
    3: accentColor,
    4: "#4ade80",
  };
}

const focusToLabel: Record<number, string> = {
  0: "No check-in",
  1: "No focus",
  2: "Brief",
  3: "Focused",
  4: "Deep",
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; value: number; initiated: boolean } }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-foreground/80 font-medium">{data.label}</p>
      <p className="text-muted-foreground/70">
        {data.initiated ? focusToLabel[data.value] : "Did not study"}
      </p>
    </div>
  );
}

export function WeeklyTrendChart({ checkIns }: WeeklyTrendChartProps) {
  // Read accent color from CSS variable so it follows theme
  const primaryHsl = typeof window !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
    : "199 89% 60%";
  const accentColor = `hsl(${primaryHsl})`;
  const focusToColor = buildFocusToColor(accentColor);

  // Build data for last 14 days
  const data = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const ci = checkIns.find((c) => c.date === dateStr);

    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const dateLabel = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (ci && ci.initiated) {
      data.push({
        day: dayLabel,
        label: dateLabel,
        value: focusToValue[ci.focusLevel || "none"] || 1,
        initiated: true,
      });
    } else if (ci) {
      data.push({
        day: dayLabel,
        label: dateLabel,
        value: 1,
        initiated: false,
      });
    } else {
      data.push({
        day: dayLabel,
        label: dateLabel,
        value: 0,
        initiated: false,
      });
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-lg">2-Week Trend</CardTitle>
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
                content={<CustomTooltip />}
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
          {[
            { label: "Brief", color: "#eab308" },
            { label: "Focused", color: accentColor },
            { label: "Deep", color: "#4ade80" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground/70 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
