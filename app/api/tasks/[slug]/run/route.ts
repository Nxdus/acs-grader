import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
    params: { slug: string } | Promise<{ slug: string }>;
};

type RunPayload = {
    languageId?: number;
    code?: string;
};

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

const shouldBase64Encode = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code === 9 || code === 10 || code === 13) continue;
        if (code < 32 || code === 127 || code > 126) return true;
    }
    return false;
};

const encodeIfNeeded = (value: string, useBase64: boolean) =>
    useBase64 ? Buffer.from(value, "utf8").toString("base64") : value;

const decodeIfNeeded = (value: string | null | undefined, useBase64: boolean) => {
    if (!value) return null;
    if (!useBase64) return value;
    return Buffer.from(value, "base64").toString("utf8");
};

const normalizeJudgeBaseUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }
    return `http://${trimmed}`;
};

const mapJudge0Status = (statusId: number) => {
    switch (statusId) {
        case 3:
            return "ACCEPTED" as const;
        case 4:
            return "WRONG_ANSWER" as const;
        case 5:
            return "TIME_LIMIT_EXCEEDED" as const;
        case 6:
            return "COMPILATION_ERROR" as const;
        case 14:
            return "RUNTIME_ERROR" as const;
        default:
            return "PENDING" as const;
    }
};

export async function POST(request: Request, { params }: RouteContext) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug?.trim();

    if (!slug) {
        return NextResponse.json(
            { error: "Slug is required." },
            { status: 400 },
        );
    }

    let payload: RunPayload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body." },
            { status: 400 },
        );
    }

    const code = isNonEmptyString(payload.code) ? payload.code.trim() : "";
    const languageId = Number(payload.languageId);

    if (!code) {
        return NextResponse.json(
            { error: "Code is required." },
            { status: 400 },
        );
    }

    if (!Number.isInteger(languageId) || languageId <= 0) {
        return NextResponse.json(
            { error: "languageId must be a positive integer." },
            { status: 400 },
        );
    }

    const problem = await prisma.problem.findUnique({
        where: { slug },
        select: { id: true, isPublished: true, allowedLanguageIds: true },
    });

    if (!problem || !problem.isPublished) {
        return NextResponse.json(
            { error: "Task not found." },
            { status: 404 },
        );
    }

    const allowedLanguageIds = problem.allowedLanguageIds ?? [];
    if (allowedLanguageIds.length > 0 && !allowedLanguageIds.includes(languageId)) {
        return NextResponse.json(
            { error: "Selected language is not allowed for this task." },
            { status: 400 },
        );
    }

    const testCases = await prisma.testCase.findMany({
        where: { problemId: problem.id, isSample: true },
        orderBy: { id: "asc" },
        select: {
            id: true,
            input: true,
            output: true,
        },
    });

    if (testCases.length === 0) {
        return NextResponse.json(
            { error: "No sample test cases found for this task." },
            { status: 400 },
        );
    }

    const judgeBaseUrl = normalizeJudgeBaseUrl(
        process.env.JUDGE0_BASE_URL || process.env.JUDGE0_URL || "",
    );

    if (!judgeBaseUrl) {
        return NextResponse.json(
            { error: "Judge0 base URL is not configured." },
            { status: 500 },
        );
    }

    const judgeApiToken = process.env.JUDGE0_API_KEY?.trim();
    const results: Array<{
        testCaseId: number;
        actualOutput: string | null;
        passed: boolean;
        judgeStatus: ReturnType<typeof mapJudge0Status>;
    }> = [];

    try {
        for (const testCase of testCases) {
            const useBase64 =
                shouldBase64Encode(code) ||
                shouldBase64Encode(testCase.input) ||
                shouldBase64Encode(testCase.output);
            const url = new URL("/submissions/", judgeBaseUrl);
            url.searchParams.set("base64_encoded", useBase64 ? "true" : "false");
            url.searchParams.set("wait", "true");

            const response = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(judgeApiToken
                        ? { "X-Auth-Token": judgeApiToken }
                        : {}),
                },
                body: JSON.stringify({
                    source_code: encodeIfNeeded(code, useBase64),
                    language_id: languageId,
                    stdin: encodeIfNeeded(testCase.input, useBase64),
                    expected_output: encodeIfNeeded(testCase.output, useBase64),
                }),
            });

            if (!response.ok) {
                throw new Error(`Judge0 request failed with ${response.status}`);
            }

            const result = (await response.json()) as {
                stdout?: string | null;
                stderr?: string | null;
                compile_output?: string | null;
                status?: { id?: number };
            };

            const statusId = result.status?.id ?? 1;
            const judgeStatus = mapJudge0Status(statusId);
            const rawOutput =
                result.stdout ??
                result.compile_output ??
                result.stderr ??
                null;

            results.push({
                testCaseId: testCase.id,
                actualOutput: decodeIfNeeded(rawOutput, useBase64),
                passed: judgeStatus === "ACCEPTED",
                judgeStatus,
            });
        }
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to run testcases on Judge0." },
            { status: 502 },
        );
    }

    return NextResponse.json({ results });
}
