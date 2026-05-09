import Groq from "groq-sdk";
import { prisma } from "@/lib/db/prisma";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

type CacheableTextField = "inspirationText" | "assessmentText";
type CacheableAtField = "inspirationAt" | "assessmentAt";

/**
 * Returns a cached AI-generated string for a user, refreshing it if stale.
 * @param userId       - the user to generate content for
 * @param cachedText   - the currently stored value (may be null)
 * @param cachedAt     - when the stored value was generated (may be null)
 * @param prompt       - Groq prompt to call when refreshing
 * @param maxAgeMs     - how long the cached value is considered fresh
 * @param textField    - UserProfile field name to persist the new text
 * @param atField      - UserProfile field name to persist the timestamp
 */
export async function generateCached(
  userId: string,
  cachedText: string | null | undefined,
  cachedAt: Date | null | undefined,
  prompt: string,
  maxAgeMs: number,
  textField: CacheableTextField,
  atField: CacheableAtField,
  maxTokens = 150
): Promise<string> {
  const isStale =
    !cachedText ||
    !cachedAt ||
    Date.now() - cachedAt.getTime() > maxAgeMs;

  if (!isStale) return cachedText!;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    stream: false,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";

  await prisma.userProfile.update({
    where: { userId },
    data: { [textField]: text, [atField]: new Date() },
  });

  return text;
}
