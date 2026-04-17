import { requireAuth } from "@/lib/session";
import { SessionTimer } from "@/components/session/SessionTimer";

export default async function SessionPage() {
  await requireAuth();

  return (
    <div className="max-w-2xl mx-auto">
      <SessionTimer />
    </div>
  );
}
