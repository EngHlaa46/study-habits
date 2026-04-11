import Groq from "groq-sdk";
import { prisma } from "@/lib/db/prisma";

interface KnowledgeUpdate {
  subject: string;
  topic: string;
  status: "struggling" | "developing" | "mastered";
  notes: string;
}

const SYSTEM_PROMPT = `You are a knowledge profiler. Given a snippet of a student's chat with an AI coach, extract any subject-matter knowledge signals.

Output a JSON array of objects (can be empty []). Each object:
{
  "subject": "the academic subject (e.g. Mathematics, Biology, History, Physics, Chemistry, Computer Science, Arabic, English)",
  "topic": "specific topic within the subject (e.g. Integration by parts, Mitosis, WWI causes)",
  "status": "struggling" | "developing" | "mastered",
  "notes": "one concise sentence about what specifically the student knows or doesn't know"
}

Rules:
- Only extract entries when there is clear evidence of the student's knowledge level (they answered questions, made errors, explained concepts, etc.)
- "struggling": student gave wrong answers, showed confusion, couldn't attempt the question
- "developing": student showed partial understanding, got some parts right
- "mastered": student answered correctly and confidently with minimal prompting
- If the conversation is about study habits only (not subject content), return []
- Maximum 3 entries per analysis
- Output ONLY the JSON array, no other text`;

export async function analyzeAndUpdateKnowledge(
  groq: Groq,
  userId: string,
  recentMessages: { role: string; content: string }[]
): Promise<void> {
  // Only analyze the last 6 messages for efficiency
  const snippet = recentMessages.slice(-6);
  if (snippet.length < 2) return;

  const conversation = snippet
    .map((m) => `${m.role === "user" ? "Student" : "Coach"}: ${m.content}`)
    .join("\n");

  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: conversation },
      ],
      max_tokens: 400,
      temperature: 0.1,
    });

    const raw = res.choices[0]?.message?.content?.trim() ?? "[]";

    // Extract JSON array from response (model may wrap it in markdown)
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return;

    const updates: KnowledgeUpdate[] = JSON.parse(match[0]);
    if (!Array.isArray(updates) || updates.length === 0) return;

    // Upsert each entry
    await Promise.all(
      updates
        .filter((u) => u.subject && u.topic && ["struggling", "developing", "mastered"].includes(u.status))
        .map((u) =>
          prisma.knowledgeEntry.upsert({
            where: { userId_subject_topic: { userId, subject: u.subject, topic: u.topic } },
            update: { status: u.status, notes: u.notes },
            create: { userId, subject: u.subject, topic: u.topic, status: u.status, notes: u.notes },
          }) as Promise<unknown>
        )
    );
  } catch {
    // Fire-and-forget — never block the response
  }
}
