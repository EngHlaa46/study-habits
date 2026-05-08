import { Suspense } from "react";
import { ScenarioGame } from "@/components/games/scenario/ScenarioGame";

export default function ScenarioPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#38bdf8] border-t-transparent animate-spin" />
      </div>
    }>
      <ScenarioGame />
    </Suspense>
  );
}
