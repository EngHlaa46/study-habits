import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ExternalLink } from "lucide-react";

const TOOLS = [
  {
    name: "StudyFetch",
    url: "https://www.studyfetch.com",
    description: "Transforms your notes and files into flashcards, quizzes, podcasts, and personalised study plans.",
    whenToUse: "Use when you need to memorise course material or want active recall practice.",
    dimension: "cognitive",
    badge: "Flashcards · Quizzes · Podcasts",
  },
  {
    name: "NotebookLM",
    url: "https://notebooklm.google.com",
    description: "Upload lecture notes and get audio summaries, mind maps, and a Q&A assistant grounded in your material.",
    whenToUse: "Use when you want to deeply understand a topic or need a structured summary before an exam.",
    dimension: "metacognitive",
    badge: "Audio · Mind Maps · Q&A",
  },
  {
    name: "Napkin",
    url: "https://www.napkin.ai",
    description: "Paste any text and Napkin auto-generates visual mind maps and diagrams to help you see connections.",
    whenToUse: "Use when your notes feel disorganised or you want to visualise a concept.",
    dimension: "cognitive",
    badge: "Visual · Mind Maps · Diagrams",
  },
  {
    name: "Consensus",
    url: "https://consensus.app",
    description: "AI-powered research engine that finds answers from peer-reviewed papers — evidence-based, not opinion.",
    whenToUse: "Use when you want to verify a study strategy or understand research behind a topic.",
    dimension: "metacognitive",
    badge: "Research · Evidence-Based",
  },
  {
    name: "Magic School",
    url: "https://www.magicschool.ai",
    description: "Generates practice quizzes, rubrics, and study prompts. Great for self-assessment before exams.",
    whenToUse: "Use when you want to test yourself with a mock quiz or simulate exam conditions.",
    dimension: "behavioral",
    badge: "Quizzes · Self-Assessment",
  },
] as const;

const DIMENSION_COLORS: Record<string, string> = {
  cognitive: "text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20",
  metacognitive: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  behavioral: "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20",
};

const DIMENSION_LABELS: Record<string, string> = {
  cognitive: "Cognitive",
  metacognitive: "Metacognitive",
  behavioral: "Behavioral",
};

export default async function ToolsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const skillProgresses = await prisma.skillProgress.findMany({
    where: { userId: session.user.id },
    include: { skill: true },
  });

  // Determine weakest dimension to highlight relevant tools
  const dimScores: Record<string, number> = { behavioral: 0, cognitive: 0, metacognitive: 0 };
  const dimCounts: Record<string, number> = { behavioral: 0, cognitive: 0, metacognitive: 0 };
  for (const sp of skillProgresses) {
    const dim = (sp.skill as unknown as { dimension?: string | null }).dimension;
    if (dim && dim in dimScores) {
      dimScores[dim] += sp.stabilityScore;
      dimCounts[dim]++;
    }
  }
  const dimAvg: Record<string, number> = {};
  for (const dim of Object.keys(dimScores)) {
    dimAvg[dim] = dimCounts[dim] > 0 ? dimScores[dim] / dimCounts[dim] : 0;
  }
  const weakestDim = Object.entries(dimAvg).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">AI Study Tools</h1>
        <p className="text-muted-foreground text-sm">
          Curated tools to complement your skill training. Use them alongside your daily sessions.
        </p>
        {weakestDim && (
          <p className="text-xs text-muted-foreground/60 mt-2">
            Based on your profile, tools for your{" "}
            <span className="text-primary">{DIMENSION_LABELS[weakestDim]}</span> dimension are highlighted.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {TOOLS.map((tool) => {
          const isRecommended = tool.dimension === weakestDim;
          return (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
              className={`block rounded-xl border p-5 transition-all hover:border-primary/40 hover:bg-card/80 ${
                isRecommended
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{tool.name}</span>
                    {isRecommended && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                        Recommended for you
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                  <p className="text-xs text-muted-foreground/70 italic mb-3">{tool.whenToUse}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded border ${DIMENSION_COLORS[tool.dimension]}`}>
                      {DIMENSION_LABELS[tool.dimension]}
                    </span>
                    <span className="text-xs text-muted-foreground/50">{tool.badge}</span>
                  </div>
                </div>
                <ExternalLink size={16} className="text-muted-foreground/40 mt-1 shrink-0" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
