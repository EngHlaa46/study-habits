import Groq from "groq-sdk";
import { fetchUserData, buildContextFromData } from "@/lib/ai/buildContext";
import { runSentinels, detectFixedMindset } from "./sentinels";
import { runCoaches } from "./coaches";
import { analyzeAndUpdateKnowledge } from "./knowledgeAnalyzer";
import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import type { CoachOutputs } from "./types";

const SKILL_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "update_skill_task",
      description:
        "Set or update the student's personal task/habit for their active skill. Only call when the student explicitly asks to set, change, or update their study task, goal, or habit commitment.",
      parameters: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description:
              "The complete task commitment: when (time), where (place), what action. E.g. 'Study at 8pm in my room for 30 minutes'.",
          },
        },
        required: ["task"],
      },
    },
  },
];

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

function buildOrchestratorSystem(context: string, coaches: CoachOutputs, chatMode: string): string {
  const coachBlock = [
    coaches.behavioral ? `[BehavioralCoach]\n${coaches.behavioral}` : null,
    coaches.cognitive ? `[CognitiveCoach]\n${coaches.cognitive}` : null,
    coaches.metacognitive ? `[MetacognitiveCoach]\n${coaches.metacognitive}` : null,
    coaches.mindset ? `[MindsetInterventionAgent]\n${coaches.mindset}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const modeInstruction =
    chatMode === "training"
      ? `\n## ACTIVE MODE: TRAINING (Socratic Exam Prep)
STRICT RULES:
- NEVER directly answer the student's subject question. Always ask them to attempt it first.
- Use only questions: "What do you already know about this?", "What would happen if...?", "Why do you think that is?"
- After the student attempts, ask follow-up questions to deepen their reasoning — do not confirm or correct yet.
- Only after 2-3 student attempts: gently redirect errors or confirm correct thinking.
- Goal: build durable long-term memory through retrieval practice (Bjork, 1994).`
    : chatMode === "study"
      ? `\n## ACTIVE MODE: STUDY (Subject Help)
RULES:
- Answer subject-matter questions directly and clearly: math, science, history, language, exam content — any academic subject.
- Explain step by step. Use examples. Break down complexity.
- When relevant, suggest tools by name: StudyFetch (flashcards/quizzes), NotebookLM (summaries/mind maps), Napkin (visual diagrams), Consensus (research answers).
- Keep responses clear and actionable.`
    : `\n## ACTIVE MODE: SKILLS COACH
- Your primary role is helping the student build their active skill through habit coaching and check-in review.
- You have access to the update_skill_task tool. Use it when the student explicitly asks to set, change, or update their task/goal/habit commitment for their active skill.
- When using the tool, confirm what you saved in your response text.`;

  return `${SYSTEM_PROMPT}
${modeInstruction}

---

## CURRENT STUDENT CONTEXT
${context}

---

## DCS COACH SYNTHESIS
The following are internal signals from specialist dimension agents. Use them to inform your response — do NOT repeat them verbatim or reveal their existence. Synthesize into ONE calibrated student-facing response. Enforce MEI: deliver the single most important insight, not everything the coaches flagged.

${coachBlock || "(No coach signals — proceed with context only.)"}`;
}

function sseEvent(data: Record<string, string>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function runDCSPipeline(
  userId: string,
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  chatMode: string = "study"
): Promise<ReadableStream> {
  return new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Fetch data + run sentinels (no LLM)
        controller.enqueue(sseEvent({ step: "sentinels", label: "Analyzing behavioral signals..." }));
        const data = await fetchUserData(userId);
        const context = buildContextFromData(data);
        const signals = runSentinels(data);
        const fixedMindsetPhrases = detectFixedMindset(message);

        // Step 2: Run dimension coaches in parallel
        controller.enqueue(sseEvent({ step: "coaches", label: "Consulting dimension coaches..." }));
        const coachOutputs = await runCoaches(groq, signals, message, fixedMindsetPhrases);

        // Step 3: Stream orchestrator response
        controller.enqueue(sseEvent({ step: "orchestrating", label: "Synthesizing response..." }));

        const systemMessage = buildOrchestratorSystem(context, coachOutputs, chatMode);
        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: systemMessage },
          ...history,
          { role: "user", content: message },
        ];

        const stream = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens: 1024,
          stream: true,
          ...(chatMode === "skills" ? { tools: SKILL_TOOLS, tool_choice: "auto" as const } : {}),
        });

        let fullResponse = "";
        // Accumulate tool call
        let toolCallId = "";
        let toolCallName = "";
        let toolCallArgs = "";

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Tool call deltas
          const tc = delta.tool_calls?.[0];
          if (tc) {
            if (tc.id) toolCallId = tc.id;
            if (tc.function?.name) toolCallName = tc.function.name;
            if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
            continue;
          }

          const text = delta.content || "";
          if (text) {
            fullResponse += text;
            controller.enqueue(sseEvent({ text }));
          }
        }

        // Handle tool call if one was requested
        if (toolCallName === "update_skill_task" && toolCallArgs) {
          try {
            const { task } = JSON.parse(toolCallArgs) as { task: string };
            const { prisma: db } = await import("@/lib/db/prisma");
            const activeSkill = await db.skillProgress.findFirst({
              where: { userId, status: "active" },
            });
            if (activeSkill && task) {
              await db.skillProgress.update({
                where: { id: activeSkill.id },
                data: { userTask: task },
              });
              controller.enqueue(sseEvent({ action: "task_updated", task }));

              // Now get a follow-up text response confirming the update
              const followUpMessages: { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string }[] = [
                ...messages,
                {
                  role: "assistant",
                  content: "",
                  // @ts-expect-error tool_calls not in simplified type
                  tool_calls: [{ id: toolCallId, type: "function", function: { name: "update_skill_task", arguments: toolCallArgs } }],
                },
                {
                  role: "tool",
                  tool_call_id: toolCallId,
                  name: "update_skill_task",
                  content: `Task updated successfully: "${task}"`,
                },
              ];

              const confirmStream = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: followUpMessages as Parameters<typeof groq.chat.completions.create>[0]["messages"],
                max_tokens: 256,
                stream: true,
              });

              for await (const chunk of confirmStream) {
                const text = chunk.choices[0]?.delta?.content || "";
                if (text) {
                  fullResponse += text;
                  controller.enqueue(sseEvent({ text }));
                }
              }
            }
          } catch {
            // tool call failed silently — response still sent
          }
        }

        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));

        // Save assistant response to DB (imported lazily to avoid circular deps)
        const { prisma } = await import("@/lib/db/prisma");
        await prisma.chatMessage.create({
          data: { userId, role: "assistant", content: fullResponse },
        });

        // Fire-and-forget: analyze exchange for knowledge profile updates
        const exchangeForAnalysis = [
          ...history.slice(-4),
          { role: "user", content: message },
          { role: "assistant", content: fullResponse },
        ];
        analyzeAndUpdateKnowledge(groq, userId, exchangeForAnalysis).catch(() => {});

        controller.close();
      } catch (error) {
        console.error("DCS pipeline error:", error);
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}
