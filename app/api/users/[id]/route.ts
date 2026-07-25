import { NextResponse } from "next/server";
import { Role, UserLevel } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function normalizeEmail(email: unknown) {
  if (typeof email !== "string") return undefined;
  const trimmed = email.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
}

function parseScore(score: unknown) {
  if (score === undefined) {
    return { ok: true as const, shouldUpdate: false as const };
  }

  const numericScore = Number(score ?? 0);

  if (!Number.isFinite(numericScore) || numericScore < 0) {
    return { ok: false as const, error: "Score must be a non-negative number." };
  }

  return {
    ok: true as const,
    shouldUpdate: true as const,
    value: Math.trunc(numericScore),
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        level: true,
        score: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const email = normalizeEmail(body?.email);
    const role = typeof body?.role === "string" ? body.role : undefined;
    const level = typeof body?.level === "string" ? body.level : undefined;
    const score = parseScore(body?.score);
    const emailVerified =
      typeof body?.emailVerified === "boolean" ? body.emailVerified : undefined;

    if (role && !Object.values(Role).includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (level && !Object.values(UserLevel).includes(level as UserLevel)) {
      return NextResponse.json({ error: "Invalid level." }, { status: 400 });
    }

    if (!score.ok) {
      return NextResponse.json({ error: score.error }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(role ? { role: role as Role } : {}),
        ...(level ? { level: level as UserLevel } : {}),
        ...(score.shouldUpdate ? { score: score.value } : {}),
        ...(emailVerified === undefined ? {} : { emailVerified }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        level: true,
        score: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        image: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
