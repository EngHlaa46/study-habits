import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let text = "";
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const buffer = Buffer.from(await file.arrayBuffer());
      const data = await pdfParse(buffer);
      text = data.text;
    } catch {
      return NextResponse.json({ error: "Failed to parse PDF" }, { status: 400 });
    }
  } else {
    text = await file.text();
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
  }

  // Use the first ~6000 chars — enough to capture any table of contents / headers
  const sample = text.slice(0, 6000);

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You extract course outlines from educational material.

Read the text and produce a clean, structured outline of the course topics: chapters, units, weeks, or major concept groups.
Output ONLY the outline as a plain bulleted list using "- " prefixes. No intro sentence, no explanation.
If the text has a clear table of contents or chapter list, use that. Otherwise infer the main topics from the content.
Max 30 bullet points. Keep each line concise (under 10 words).`,
      },
      {
        role: "user",
        content: sample,
      },
    ],
    max_tokens: 600,
    temperature: 0.2,
  });

  const outline = response.choices[0]?.message?.content?.trim() ?? "";
  if (!outline) {
    return NextResponse.json({ error: "Could not extract outline" }, { status: 500 });
  }

  return NextResponse.json({ outline });
}
