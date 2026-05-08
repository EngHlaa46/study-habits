"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-foreground mb-4">
          Skills <span className="text-primary">Builder</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-2">
          One skill at a time. One habit that sticks.
        </p>
        <p className="text-muted-foreground/70 mb-8 max-w-md mx-auto">
          AI-guided system that helps you build real study skills through a
          structured 3-week cycle. No streaks. No points. Just progress.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground font-semibold px-8 py-6 text-lg">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              className="border-border text-foreground/80 hover:bg-card px-8 py-6 text-lg"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
