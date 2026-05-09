import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

interface IcsEvent {
  uid: string;
  summary: string;
  date: Date;
  description: string | null;
}

// Minimal ICS parser — extracts VEVENT blocks and reads the fields we need
function parseICS(text: string): IcsEvent[] {
  const results: IcsEvent[] = [];
  // Split into VEVENT blocks
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    // Unfold continuation lines (RFC 5545: lines starting with space/tab are continuations)
    const unfolded = block.replace(/\r?\n[ \t]/g, "");

    const get = (key: string): string => {
      const match = unfolded.match(new RegExp(`(?:^|\\n)${key}[^:;]*(?:;[^:]*)?:([^\\r\\n]*)`, "i"));
      return match ? match[1].trim() : "";
    };

    const uid = get("UID");
    const summary = get("SUMMARY").replace(/\\,/g, ",").replace(/\\n/g, " ").replace(/\\/g, "");
    if (!summary) continue;

    // Try DTEND first, fall back to DUE, then DTSTART
    const rawDate = get("DTEND") || get("DUE") || get("DTSTART");
    if (!rawDate) continue;

    const date = parseIcsDate(rawDate);
    if (!date || isNaN(date.getTime())) continue;

    const description = get("DESCRIPTION") || null;

    results.push({ uid, summary, date, description });
  }
  return results;
}

// Parse ICS date formats: 20260415T120000Z, 20260415T120000, 20260415
function parseIcsDate(raw: string): Date | null {
  const clean = raw.replace(/^TZID=[^:]+:/, "").trim();
  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(clean)) {
    return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00Z`);
  }
  // DateTime: YYYYMMDDTHHmmss[Z]
  if (/^\d{8}T\d{6}Z?$/.test(clean)) {
    const s = clean.replace("Z", "");
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}${clean.endsWith("Z") ? "Z" : ""}`;
    return new Date(iso);
  }
  return null;
}

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
  const { url, filterKeyword } = body as { url?: string; filterKeyword?: string };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

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

  const events = parseICS(icsText);

  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  let imported = 0;
  let skipped = 0;

  const keyword = filterKeyword?.trim().toLowerCase();

  for (const ev of events) {
    if (ev.date < now || ev.date > horizon) continue;

    if (keyword) {
      const haystack = `${ev.summary} ${ev.description ?? ""}`.toLowerCase();
      if (!haystack.includes(keyword)) { skipped++; continue; }
    }

    if (ev.uid) {
      const existing = await prisma.event.findFirst({ where: { userId, calendarUid: ev.uid } });
      if (existing) { skipped++; continue; }
    }

    await prisma.event.create({
      data: {
        userId,
        name: ev.summary.slice(0, 200),
        type: inferType(ev.summary),
        date: ev.date,
        notes: ev.description ? ev.description.slice(0, 1000) : null,
        calendarUid: ev.uid || null,
      },
    });
    imported++;
  }

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
