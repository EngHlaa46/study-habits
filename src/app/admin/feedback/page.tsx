import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = "milkyyway46@gmail.com";

export default async function AdminFeedbackPage() {
  const session = await requireAuth();
  if (session.user.email !== ADMIN_EMAIL) redirect("/dashboard");

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-foreground mb-6">User Feedback</h1>
      {feedbacks.length === 0 ? (
        <p className="text-muted-foreground">No feedback yet.</p>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((f) => (
            <div key={f.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">
                  {f.user.name ?? f.user.email}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {new Date(f.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
