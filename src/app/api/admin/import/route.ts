import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const IMPORT_SECRET = process.env.CRON_SECRET;

// Ordered to respect foreign key constraints
const TABLE_ORDER = [
  "User",
  "UserProfile",
  "Skill",
  "SkillDependency",
  "SkillProgress",
  "ActivePhase",
  "CheckIn",
  "Event",
  "ChatMessage",
  "Notification",
  "PushSubscription",
  "Feedback",
  "PasswordResetToken",
];

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-import-secret");
  if (auth !== IMPORT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Push schema first
  let schemaPush = "";
  try {
    const { stdout, stderr } = await execAsync(
      "npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss",
      { timeout: 60000 }
    );
    schemaPush = stdout + stderr;
  } catch (err) {
    return NextResponse.json({ error: "Schema push failed", detail: String(err) }, { status: 500 });
  }

  const data = await req.json();
  const results: Record<string, number> = {};

  for (const table of TABLE_ORDER) {
    const rows = data[table];
    if (!rows || rows.length === 0) {
      results[table] = 0;
      continue;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)];
      if (!model) {
        results[table] = -1;
        continue;
      }
      await model.deleteMany();
      await model.createMany({ data: rows, skipDuplicates: true });
      results[table] = rows.length;
    } catch (err) {
      results[table] = -1;
      console.error(`Import error for ${table}:`, err);
    }
  }

  return NextResponse.json({ ok: true, schemaPush: schemaPush.substring(0, 500), results });
}
