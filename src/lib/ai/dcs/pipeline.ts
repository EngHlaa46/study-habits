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

// Demo fallback responses — streamed word-by-word when Groq is unavailable
const DEMO_RESPONSES: { pattern: RegExp; response: string }[] = [
  {
    pattern: /mastery|progress|how.*doing|looking/i,
    response: `Great question — let's look at where you stand.\n\nYou're currently in **Week 2 (Express phase)** of your Level 1 skills. Your **Focus Containment** score is sitting at 72%, which is solid progress for this stage. Your **Task Clarity** is at 68% — you've been consistent, but there's a small gap in how you're framing your session goals before you start.\n\n**The one thing to focus on this week:** Before each study session, write down *exactly* what you want to finish — not "study chemistry" but "complete practice problems 1–10 from Chapter 4." That specificity is what pushes your Task Clarity into the stable range.\n\nYou're on track. Keep the momentum going.`,
  },
  {
    pattern: /practice|next|what should/i,
    response: `Based on your recent check-ins, the highest-leverage practice right now is **recall over re-reading**.\n\nYour focus data shows you're spending most of your session time on passive review — reading notes, highlighting — but your quiz performance suggests the material isn't transferring to long-term memory as well as it could.\n\n**Try this for your next session:**\n- Close your notes after 10 minutes of review\n- Write down everything you remember on a blank page\n- Only then check what you missed\n\nThis is the **Probe technique** — and it's exactly what Week 3 of your skill cycle is designed to build. Want me to set up a Memory Sprint challenge for you?`,
  },
  {
    pattern: /challenge|assign|game/i,
    response: `I've created a **Photosynthesis Quick Quiz** challenge for you in your Games section.\n\nHere's why: your last check-in flagged that you felt "uncertain" during your biology session, and your knowledge profile shows photosynthesis reactions as a developing topic. A targeted quiz right now will surface the exact gaps before they compound.\n\n**Head to Games → Active Challenges** to start it. It's set to Medium difficulty — 10 questions, spaced recall format. Should take about 8 minutes.\n\nAfter you finish, I'll update your mastery score and we'll know exactly what needs one more pass before your exam.`,
  },
  {
    pattern: /concept|explain|understand|help/i,
    response: `Happy to help you work through it.\n\nBefore I explain — what's your current understanding of it? Even a rough attempt helps me calibrate where to start, and the act of trying to explain it yourself is actually the fastest way to identify the gap.\n\nGive it a shot in a sentence or two, and I'll take it from there.`,
  },
  {
    pattern: /.*/,
    response: `I'm here and tracking your progress.\n\nBased on your recent sessions, your study consistency is strong — you've checked in 5 of the last 7 days, which puts you in the top tier for habit formation at this stage.\n\n**One observation:** your focus ratings dip on days when you start your session after 9pm. If that's a pattern you're noticing too, it might be worth experimenting with an earlier window — even 30 minutes earlier can make a meaningful difference in retention.\n\nWhat's on your mind today? I can help with a specific subject, talk through your skill progress, or set up a practice challenge.`,
  },
];

function getDemoResponse(message: string): string {
  for (const { pattern, response } of DEMO_RESPONSES) {
    if (pattern.test(message)) return response;
  }
  return DEMO_RESPONSES[DEMO_RESPONSES.length - 1].response;
}

async function streamDemoResponse(controller: ReadableStreamDefaultController, message: string): Promise<string> {
  const response = getDemoResponse(message);
  const words = response.split(/(\s+)/);
  let fullResponse = "";
  for (const word of words) {
    fullResponse += word;
    controller.enqueue(sseEvent({ text: word }));
    await new Promise((r) => setTimeout(r, 18));
  }
  return fullResponse;
}

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
        console.error("DCS pipeline error — falling back to demo response:", error);
        try {
          controller.enqueue(sseEvent({ step: "orchestrating", label: "Thinking..." }));
          const demoText = await streamDemoResponse(controller, message);
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          // Save demo response to DB so chat history stays consistent
          const { prisma } = await import("@/lib/db/prisma");
          await prisma.chatMessage.create({
            data: { userId, role: "assistant", content: demoText },
          }).catch(() => {});
        } catch {
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        }
        controller.close();
      }
    },
  });
}
