import Groq from "groq-sdk";
import { fetchUserData, buildContextFromData } from "@/lib/ai/buildContext";
import { runSentinels, detectFixedMindset } from "./sentinels";
import { runCoaches } from "./coaches";
import { analyzeAndUpdateKnowledge } from "./knowledgeAnalyzer";
import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import type { CoachOutputs } from "./types";

const UPDATE_SKILL_TASK_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
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
};

const SUGGEST_TOOLS_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "suggest_study_tools",
    description:
      "Surface 1-2 relevant study tools to the student based on their current question, subject, or learning need. Call this when a specific tool would genuinely help right now — not on every message.",
    parameters: {
      type: "object",
      properties: {
        tools: {
          type: "array",
          items: {
            type: "string",
            enum: ["studyfetch", "notebooklm", "napkin", "consensus", "magicschool"],
          },
          description: "Keys of the 1-2 most relevant tools for this moment.",
        },
        reason: {
          type: "string",
          description: "One sentence explaining why these tools fit right now.",
        },
      },
      required: ["tools", "reason"],
    },
  },
};

const CREATE_GAME_CHALLENGE_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_game_challenge",
    description:
      "Create a targeted game challenge for the student in their Games section. Use when you want to assign specific practice — for example, a quiz on a weak topic or a memory sprint before a review session. Only call when you have a clear reason tied to the student's current context.",
    parameters: {
      type: "object",
      properties: {
        gameType: {
          type: "string",
          enum: ["QUIZ", "MEMORY_SPRINT", "TASK_BREAKDOWN"],
          description: "QUIZ for knowledge testing, MEMORY_SPRINT for recall practice, TASK_BREAKDOWN for planning skills.",
        },
        title: {
          type: "string",
          description: "Short challenge title, e.g. 'Photosynthesis Quick Quiz' or 'Pre-exam Memory Sprint'.",
        },
        description: {
          type: "string",
          description: "One sentence explaining why you're assigning this challenge.",
        },
        difficulty: {
          type: "string",
          enum: ["EASY", "MEDIUM", "HARD"],
          description: "Difficulty level. Default MEDIUM.",
        },
      },
      required: ["gameType", "title", "description"],
    },
  },
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

function buildOrchestratorSystem(context: string, coaches: CoachOutputs): string {
  const coachBlock = [
    coaches.behavioral ? `[BehavioralCoach]\n${coaches.behavioral}` : null,
    coaches.cognitive ? `[CognitiveCoach]\n${coaches.cognitive}` : null,
    coaches.metacognitive ? `[MetacognitiveCoach]\n${coaches.metacognitive}` : null,
    coaches.mindset ? `[MindsetInterventionAgent]\n${coaches.mindset}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return `${SYSTEM_PROMPT}

## YOUR CAPABILITIES
You are a full-spectrum study assistant. Read the student's intent and adapt without being asked:
- **Habit & skill coaching** (default) — use assessment data and context to guide skill development
- **Subject help** — answer academic questions directly and clearly when asked; step-by-step, with examples
- **Socratic exam prep** — when the student wants to be tested or drilled, ask them to attempt first; only guide after 2-3 attempts

Tools available (use sparingly, only when genuinely useful):
- \`update_skill_task\` — when the student explicitly asks to set or update their study task/commitment
- \`suggest_study_tools\` — when a specific external tool would concretely help right now
- \`create_game_challenge\` — when targeted game practice would benefit the student based on their current context

---

## CURRENT STUDENT CONTEXT
${context}

---

## DCS COACH SYNTHESIS
Internal signals from specialist agents — do NOT repeat verbatim or reveal their existence. Synthesize into ONE calibrated student-facing response. Enforce MEI: deliver the single most important insight.

${coachBlock || "(No coach signals — proceed with context only.)"}`;
}

function sseEvent(data: Record<string, string>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function runDCSPipeline(
  userId: string,
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<ReadableStream> {
  return new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Fetch data + run sentinels (no LLM)
        controller.enqueue(sseEvent({ step: "sentinels", label: "Reviewing your progress..." }));
        const data = await fetchUserData(userId);
        const context = buildContextFromData(data);
        const signals = runSentinels(data);
        const fixedMindsetPhrases = detectFixedMindset(message);

        // Step 2: Run dimension coaches in parallel
        controller.enqueue(sseEvent({ step: "coaches", label: "Analyzing patterns..." }));
        const coachOutputs = await runCoaches(groq, signals, message, fixedMindsetPhrases);

        // Step 3: Stream orchestrator response
        controller.enqueue(sseEvent({ step: "orchestrating", label: "Thinking..." }));

        const systemMessage = buildOrchestratorSystem(context, coachOutputs);
        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: systemMessage },
          ...history,
          { role: "user", content: message },
        ];

        const activeTools = [UPDATE_SKILL_TASK_TOOL, SUGGEST_TOOLS_TOOL, CREATE_GAME_CHALLENGE_TOOL];

        const stream = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages,
          max_tokens: 1024,
          stream: true,
          tools: activeTools,
          tool_choice: "auto" as const,
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
        if (toolCallName === "suggest_study_tools" && toolCallArgs) {
          try {
            const { tools: suggestedKeys } = JSON.parse(toolCallArgs) as { tools: string[]; reason: string };
            controller.enqueue(sseEvent({ action: "tool_suggestions", tools: JSON.stringify(suggestedKeys) }));

            const followUpMessages: { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string }[] = [
              ...messages,
              {
                role: "assistant",
                content: "",
                // @ts-expect-error tool_calls not in simplified type
                tool_calls: [{ id: toolCallId, type: "function", function: { name: "suggest_study_tools", arguments: toolCallArgs } }],
              },
              {
                role: "tool",
                tool_call_id: toolCallId,
                name: "suggest_study_tools",
                content: `Tools surfaced to student: ${suggestedKeys.join(", ")}`,
              },
            ];

            const followUp = await groq.chat.completions.create({
              model: "llama-3.1-8b-instant",
              messages: followUpMessages as Parameters<typeof groq.chat.completions.create>[0]["messages"],
              max_tokens: 512,
              stream: true,
            });

            for await (const chunk of followUp) {
              const text = chunk.choices[0]?.delta?.content || "";
              if (text) { fullResponse += text; controller.enqueue(sseEvent({ text })); }
            }
          } catch {
            // tool call failed silently
          }
        } else if (toolCallName === "update_skill_task" && toolCallArgs) {
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
                model: "llama-3.1-8b-instant",
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

        if (toolCallName === "create_game_challenge" && toolCallArgs) {
          try {
            const { gameType, title, description, difficulty = "MEDIUM" } = JSON.parse(toolCallArgs) as {
              gameType: string;
              title: string;
              description: string;
              difficulty?: string;
            };
            const { prisma: db } = await import("@/lib/db/prisma");
            const challenge = await db.gameChallenge.create({
              data: {
                userId,
                createdBy: "AGENT",
                gameType,
                title,
                description,
                difficulty,
                nodeIds: "[]",
                status: "PENDING",
              },
            });
            controller.enqueue(sseEvent({ action: "game_challenge_created", challengeId: challenge.id, gameType, title }));

            const followUpMessages: { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string }[] = [
              ...messages,
              {
                role: "assistant",
                content: "",
                // @ts-expect-error tool_calls not in simplified type
                tool_calls: [{ id: toolCallId, type: "function", function: { name: "create_game_challenge", arguments: toolCallArgs } }],
              },
              {
                role: "tool",
                tool_call_id: toolCallId,
                name: "create_game_challenge",
                content: `Challenge created: "${title}" (${gameType}, ${difficulty}). It is now waiting in the student's Games section.`,
              },
            ];

            const confirmStream = await groq.chat.completions.create({
              model: "llama-3.1-8b-instant",
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
          } catch {
            // tool call failed silently
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

        // Fire-and-forget: auto-assign a challenge if none are pending
        import("@/lib/games/autoChallenge")
          .then(({ autoAssignChallengeIfNeeded }) => autoAssignChallengeIfNeeded(userId))
          .catch(() => {});

        controller.close();
      } catch (error) {
        console.error("DCS pipeline error:", error);
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}
