import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function normalizeEmail(email: unknown) {
  if (typeof email !== "string") return undefined;
  const trimmed = email.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
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
    const emailVerified =
      typeof body?.emailVerified === "boolean" ? body.emailVerified : undefined;

    if (role && !Object.values(Role).includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(role ? { role: role as Role } : {}),
        ...(emailVerified === undefined ? {} : { emailVerified }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
