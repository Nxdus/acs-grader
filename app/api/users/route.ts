import { NextResponse } from "next/server";
import { Prisma, Role } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const sortableFields = new Set(["createdAt", "updatedAt", "name", "email"]);

function parseBoolean(value: string | null) {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const role = url.searchParams.get("role");
    const emailVerified = parseBoolean(url.searchParams.get("emailVerified"));
    const sort = url.searchParams.get("sort") ?? "createdAt";
    const direction = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.max(
      1,
      Math.min(50, Number(url.searchParams.get("pageSize") ?? "20")),
    );

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(role && Object.values(Role).includes(role as Role)
        ? { role: role as Role }
        : {}),
      ...(emailVerified === undefined ? {} : { emailVerified }),
    };

    const orderBy = sortableFields.has(sort)
      ? { [sort]: direction }
      : { createdAt: Prisma.SortOrder.desc };

    const [total, items, verified, unverified, admins] =
      await prisma.$transaction([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
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
        }),
        prisma.user.count({ where: { ...where, emailVerified: true } }),
        prisma.user.count({ where: { ...where, emailVerified: false } }),
        prisma.user.count({ where: { ...where, role: Role.ADMIN } }),
      ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      stats: {
        verified,
        unverified,
        admins,
      },
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body?.role === "string" ? body.role : "USER";
    const emailVerified = Boolean(body?.emailVerified);

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 },
      );
    }

    if (!Object.values(Role).includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const now = new Date();

    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email,
        role: role as Role,
        emailVerified,
        createdAt: now,
        updatedAt: now,
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
