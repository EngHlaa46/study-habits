import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import ical, { type VEvent } from "node-ical";

// Infer event type from the ICS event summary
function inferType(summary: string): string {
  const lower = summary.toLowerCase();
  if (lower.includes("exam") || lower.includes("final") || lower.includes("midterm")) return "exam";
  if (lower.includes("quiz")) return "quiz";
  if (lower.includes("deadline") || lower.includes("due") || lower.includes("submission") || lower.includes("submit")) return "deadline";
  if (lower.includes("project") || lower.includes("presentation")) return "project";
  return "other";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const { url } = body as { url?: string };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  // Basic URL validation — must be http(s)
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Fetch the ICS feed
  let icsText: string;
  try {
    const res = await fetch(parsed.href, {
      headers: { "User-Agent": "StudySkillsBuilder/1.0 calendar-sync" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icsText = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch";
    return NextResponse.json({ error: `Could not fetch calendar: ${msg}` }, { status: 422 });
  }

  // Parse ICS
  const events = ical.sync.parseICS(icsText);

  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days out

  let imported = 0;
  let skipped = 0;

  for (const key of Object.keys(events)) {
    const component = events[key];
    if (!component || component.type !== "VEVENT") continue;
    const ev = component as VEvent;

    const summary = typeof ev.summary === "string" ? ev.summary.trim() : "";
    if (!summary) continue;

    // Use DTEND or DTSTART as the deadline date
    const date: Date | undefined = ev.end instanceof Date ? ev.end : ev.start instanceof Date ? ev.start : undefined;
    if (!date || isNaN(date.getTime())) continue;
    if (date < now || date > horizon) continue;

    const uid = typeof ev.uid === "string" ? ev.uid : key;

    // Skip if already imported (by UID)
    if (uid) {
      const existing = await prisma.event.findFirst({
        where: { userId, calendarUid: uid },
      });
      if (existing) { skipped++; continue; }
    }

    await prisma.event.create({
      data: {
        userId,
        name: summary.slice(0, 200),
        type: inferType(summary),
        date,
        notes: typeof ev.description === "string" ? ev.description.slice(0, 1000) : null,
        calendarUid: uid || null,
      },
    });
    imported++;
  }

  // Save the feed URL + last-synced timestamp
  await prisma.userProfile.upsert({
    where: { userId },
    update: { calendarFeedUrl: url, calendarLastSynced: new Date() },
    create: { userId, calendarFeedUrl: url, calendarLastSynced: new Date() },
  });

  return NextResponse.json({ imported, skipped });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: { calendarFeedUrl: null, calendarLastSynced: null },
  });

  return NextResponse.json({ success: true });
}
