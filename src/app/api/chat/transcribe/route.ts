import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Groq from "groq-sdk";
import { toFile } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  const lang = (formData.get("lang") as string) || "en";

  if (!audio) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const audioMime = audio.type || "audio/webm";
  const ext = audioMime.includes("mp4") ? "mp4" : "webm";
  const file = await toFile(buffer, `recording.${ext}`, { type: audioMime });

  const result = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    language: lang === "ar" ? "ar" : "en",
    response_format: "json",
  });

  return NextResponse.json({ transcript: result.text });
}
