"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const RESEND_COOLDOWN = 60; // seconds

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendRequest = async (isResend = false) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resend: isResend }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Something went wrong");
      } else {
        setSubmitted(true);
        setCooldown(RESEND_COOLDOWN);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendRequest();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground">Reset Password</CardTitle>
          <CardDescription className="text-muted-foreground">
            {submitted
              ? "Check your email for a reset link"
              : "Enter your email to receive a password reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center">
              <p className="text-[#4ade80] text-sm">
                If an account with that email exists, we sent a reset link.
              </p>
              <Button
                onClick={() => sendRequest(true)}
                disabled={loading || cooldown > 0}
                variant="outline"
                className="w-full border-border text-foreground hover:bg-surface-inset"
              >
                {loading
                  ? "Sending..."
                  : cooldown > 0
                  ? `Resend email (${cooldown}s)`
                  : "Resend email"}
              </Button>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Link
                href="/login"
                className="text-primary hover:underline text-sm block"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/80">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-surface-inset border-border text-foreground"
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <p className="text-center text-muted-foreground text-sm">
                <Link href="/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
