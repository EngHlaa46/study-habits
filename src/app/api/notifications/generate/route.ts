import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import Groq from "groq-sdk";
import * as webpush from "web-push";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@studyhabits.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToUser(userId: string, title: string, body: string) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url: "/dashboard" })
      );
    } catch {
      // Subscription expired — remove it
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    }
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      profile: { onboardingComplete: true },
    },
    include: {
      profile: true,
      activePhase: true,
      checkIns: {
        orderBy: { date: "desc" },
        take: 14,
      },
      skillProgresses: {
        include: { skill: true },
      },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let created = 0;

  for (const user of users) {
    // Skip if already notified today
    const existing = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: today },
      },
    });
    if (existing) continue;

    const phase = user.activePhase?.phase ?? "observation";
    const activeSkillProgress = user.skillProgresses.find((sp) => sp.status === "active");
    const activeSkill = activeSkillProgress?.skill?.name ?? null;

    // Determine if this is a weekly insight day (same weekday as account creation)
    const createdWeekday = user.createdAt.getDay();
    const isWeeklyDay = today.getDay() === createdWeekday;

    // Build daily context
    const last7 = user.checkIns.slice(0, 7);
    const studiedDays = last7.filter((c) => c.initiated).length;
    const recentDays = last7.length;

    if (isWeeklyDay) {
      // Weekly cognitive-behavioral insight
      const last14 = user.checkIns.slice(0, 14);
      const initiated14 = last14.filter((c) => c.initiated).length;
      const focused14 = last14.filter(
        (c) => c.focusLevel === "focused" || c.focusLevel === "deep"
      ).length;

      // Dimension profile
      const dimGroups: Record<string, { scores: number[]; statuses: string[] }> = {};
      for (const sp of user.skillProgresses) {
        const dim = (sp.skill as { dimension?: string | null }).dimension;
        if (!dim) continue;
        if (!dimGroups[dim]) dimGroups[dim] = { scores: [], statuses: [] };
        dimGroups[dim].statuses.push(sp.status);
        if (["active", "stable", "mastered"].includes(sp.status)) {
          dimGroups[dim].scores.push(sp.stabilityScore);
        }
      }
      const dimSummary = Object.entries(dimGroups).map(([dim, { scores, statuses }]) => {
        const avg = scores.length > 0
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
          : "0.00";
        const label = statuses.includes("stable") || statuses.includes("mastered")
          ? "strong"
          : statuses.includes("active") ? "developing" : "early";
        return `${dim}=${label}(${avg})`;
      });

      // Procrastination pattern
      const missReasonCount: Record<string, number> = {};
      for (const ci of last14) {
        const reason = (ci as { missReason?: string | null }).missReason;
        if (reason) missReasonCount[reason] = (missReasonCount[reason] ?? 0) + 1;
      }
      const repeatedReasons = Object.entries(missReasonCount)
        .filter(([, c]) => c >= 2)
        .map(([r, c]) => `"${r}" (${c}x)`)
        .join(", ");

      const weeklyContext = [
        `Student: ${user.name ?? "there"}`,
        `Phase: ${phase}`,
        activeSkill ? `Active skill: ${activeSkill} (week ${activeSkillProgress?.weekPhase ?? 0})` : null,
        `14-day check-ins: ${initiated14}/${last14.length} initiated, ${focused14} focused/deep`,
        dimSummary.length > 0 ? `Dimension profile: ${dimSummary.join(", ")}` : null,
        repeatedReasons ? `Recurring obstacles: ${repeatedReasons}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a study behavior coach writing a weekly insight for a student. Write 2-3 sentences: (1) which dimension showed the most activity or improvement this week based on the data; (2) one behavioral pattern you observe in the data; (3) one specific, actionable suggestion for the coming week. Be direct and data-grounded. No generic praise. No emojis. Under 100 words.",
            },
            { role: "user", content: weeklyContext },
          ],
          max_tokens: 140,
          temperature: 0.7,
        });

        const content = completion.choices[0]?.message?.content?.trim();
        if (!content) continue;

        await prisma.notification.create({
          data: { userId: user.id, content, type: "weekly" },
        });
        await sendPushToUser(user.id, "Weekly insight", content);
        created++;
      } catch {
        // Fall through to daily notification on error
      }
    } else {
      // Daily notification
      const contextLines = [
        `Student: ${user.name ?? "there"}`,
        `Phase: ${phase}`,
        activeSkill ? `Active skill: ${activeSkill}` : null,
        `Recent check-ins: ${studiedDays}/${recentDays} days studied`,
      ]
        .filter(Boolean)
        .join(". ");

      try {
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a supportive study coach. Write a single short, warm, personalized daily notification (1-2 sentences, max 120 characters) to motivate the student based on their context. No emojis. No greeting prefix.",
            },
            { role: "user", content: contextLines },
          ],
          max_tokens: 60,
          temperature: 0.8,
        });

        const content = completion.choices[0]?.message?.content?.trim();
        if (!content) continue;

        await prisma.notification.create({
          data: { userId: user.id, content, type: "daily" },
        });
        await sendPushToUser(user.id, "Study Skills Builder", content);
        created++;
      } catch {
        // Skip this user on error; don't abort the whole batch
      }
    }
  }

  return NextResponse.json({ ok: true, created });
}
