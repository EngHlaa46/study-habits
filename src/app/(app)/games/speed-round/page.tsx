import { Suspense } from "react";
import { SpeedRoundGame } from "@/components/games/speed/SpeedRoundGame";

export default function SpeedRoundPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#4ade80] border-t-transparent animate-spin" />
      </div>
    }>
      <SpeedRoundGame />
    </Suspense>
  );
}
