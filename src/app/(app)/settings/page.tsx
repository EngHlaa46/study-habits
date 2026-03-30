"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/language";

const ACCENT_COLORS = [
  { hex: "#38bdf8", label: "Cyan", hsl: "199 89% 60%" },
  { hex: "#a855f7", label: "Purple", hsl: "270 91% 65%" },
  { hex: "#f97316", label: "Orange", hsl: "24 94% 53%" },
  { hex: "#fbbf24", label: "Amber", hsl: "43 96% 56%" },
  { hex: "#4ade80", label: "Green", hsl: "142 71% 65%" },
  { hex: "#fb7185", label: "Rose", hsl: "351 95% 71%" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [activeColor, setActiveColor] = useState<string>("#38bdf8");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/theme-prefs")
      .then((r) => r.json())
      .then((prefs) => { if (prefs.accentColor) setActiveColor(prefs.accentColor); })
      .catch(() => {});
  }, []);

  async function applyColor(hex: string, hsl: string) {
    setActiveColor(hex);
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--ring", hsl);
    document.documentElement.style.setProperty("--chart-1", hsl);
    setSaving(true);
    await fetch("/api/user/theme-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accentColor: hex }),
    }).finally(() => setSaving(false));
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t("settings.title")}</h1>

      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t("settings.account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{t("settings.email")}</span>
            <span className="text-foreground/80 text-sm">
              {session?.user?.email}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{t("settings.name")}</span>
            <span className="text-foreground/80 text-sm">
              {session?.user?.name || t("settings.notSet")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t("settings.appearance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-muted-foreground text-sm mb-3">{t("settings.accentColor")}</p>
            <div className="flex gap-3 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  title={c.label}
                  onClick={() => applyColor(c.hex, c.hsl)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    activeColor === c.hex
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            {saving && <p className="text-muted-foreground text-xs mt-2">{t("settings.saving")}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t("settings.actions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator className="bg-border" />
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="border-red-900 text-red-400 hover:bg-red-900/20"
          >
            {t("settings.signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
