import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, password, name } = await req.json();
    const email = rawEmail?.toLowerCase().trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        profile: { create: {} },
        activePhase: { create: { phase: "onboarding" } },
      },
    });

    // Initialize skill progress for level 1 skills (available by default)
    const level1Skills = await prisma.skill.findMany({
      where: { level: 1 },
    });

    for (const skill of level1Skills) {
      await prisma.skillProgress.create({
        data: {
          userId: user.id,
          skillId: skill.id,
          status: "available",
        },
      });
    }

    // Initialize remaining skills as locked
    const otherSkills = await prisma.skill.findMany({
      where: { level: { gt: 1 } },
    });

    for (const skill of otherSkills) {
      await prisma.skillProgress.create({
        data: {
          userId: user.id,
          skillId: skill.id,
          status: "locked",
        },
      });
    }

    return NextResponse.json(
      { message: "User created", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
