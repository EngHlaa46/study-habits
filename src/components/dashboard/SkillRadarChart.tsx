"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface SkillData {
  name: string;
  status: string;
  stabilityScore: number;
}

interface SkillRadarChartProps {
  skills: SkillData[];
}

function statusToValue(status: string, stabilityScore: number): number {
  switch (status) {
    case "locked":
      return 5;
    case "available":
      return 15;
    case "active":
      return 25 + stabilityScore * 50;
    case "stable":
      return 75 + stabilityScore * 15;
    case "mastered":
      return 90 + stabilityScore * 10;
    default:
      return 5;
  }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { skill: string; value: number; status: string; stability: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-foreground font-medium">{data.skill}</p>
      <p className="text-muted-foreground capitalize">
        {data.status} &middot; {data.stability}% stability
      </p>
    </div>
  );
}

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  const data = skills.map((s) => ({
    skill: s.name,
    value: statusToValue(s.status, s.stabilityScore),
    status: s.status,
    stability: Math.round(s.stabilityScore * 100),
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-foreground text-lg font-semibold mb-4">
        Skill Radar
      </h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <Radar
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
