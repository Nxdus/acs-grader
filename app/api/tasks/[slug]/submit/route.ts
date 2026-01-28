import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
    params: { slug: string } | Promise<{ slug: string }>;
};

type SubmissionPayload = {
    userId?: string;
    languageId?: number;
    language?: string;
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
        case 1:
        case 2:
            return "PENDING" as const;
        case 3:
            return "ACCEPTED" as const;
        case 4:
            return "WRONG_ANSWER" as const;
        case 5:
            return "TIME_LIMIT_EXCEEDED" as const;
        case 6:
            return "COMPILATION_ERROR" as const;
        case 7:
            return "RUNTIME_ERROR" as const;
        case 8:
            return "RUNTIME_ERROR" as const;
        case 9:
            return "RUNTIME_ERROR" as const;
        case 10:
            return "RUNTIME_ERROR" as const;
        case 11:
            return "RUNTIME_ERROR" as const;
        case 12:
            return "RUNTIME_ERROR" as const;
        case 13:
            return "INTERNAL_ERROR" as const;
        case 14:
            return "EXEC_FORMAT_ERROR" as const;
        default:
            return "PENDING" as const;
    }
};

const pickFinalStatus = (statuses: Array<ReturnType<typeof mapJudge0Status>>) => {
    if (statuses.includes("INTERNAL_ERROR")) return "INTERNAL_ERROR";
    if (statuses.includes("COMPILATION_ERROR")) return "COMPILATION_ERROR";
    if (statuses.includes("EXEC_FORMAT_ERROR")) return "EXEC_FORMAT_ERROR";
    if (statuses.includes("RUNTIME_ERROR")) return "RUNTIME_ERROR";
    if (statuses.includes("TIME_LIMIT_EXCEEDED")) return "TIME_LIMIT_EXCEEDED";
    if (statuses.includes("WRONG_ANSWER")) return "WRONG_ANSWER";
    if (statuses.every((status) => status === "ACCEPTED")) return "ACCEPTED";
    return "PENDING";
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

    let payload: SubmissionPayload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body." },
            { status: 400 },
        );
    }

    const userId = isNonEmptyString(payload.userId) ? payload.userId.trim() : "";
    const language = isNonEmptyString(payload.language)
        ? payload.language.trim()
        : "";
    const code = isNonEmptyString(payload.code) ? payload.code.trim() : "";
    const languageId = Number(payload.languageId);

    if (!userId || !language || !code) {
        return NextResponse.json(
            { error: "userId, language, and code are required." },
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
        where: { problemId: problem.id },
        orderBy: { id: "asc" },
        select: {
            id: true,
            input: true,
            output: true,
        },
    });

    if (testCases.length === 0) {
        return NextResponse.json(
            { error: "No test cases found for this task." },
            { status: 400 },
        );
    }

    const submission = await prisma.submission.create({
        data: {
            userId,
            problemId: problem.id,
            languageId,
            language,
            code,
        },
    });

    const judgeBaseUrl = normalizeJudgeBaseUrl(
        process.env.JUDGE0_BASE_URL || "",
    );

    if (!judgeBaseUrl) {
        return NextResponse.json(
            { error: "Judge0 base URL is not configured." },
            { status: 500 },
        );
    }

    const waitForResult = process.env.JUDGE0_WAIT !== "false";
    const judgeApiToken = process.env.JUDGE0_API_KEY?.trim();
    const submissionResults: {
        testCaseId: number;
        actualOutput: string | null;
        passed: boolean;
        runtime: number | null;
        judgeStatus: ReturnType<typeof mapJudge0Status>;
        memory: number | null;
    }[] = [];

    try {
        for (const testCase of testCases) {
            const useBase64 =
                shouldBase64Encode(code) ||
                shouldBase64Encode(testCase.input) ||
                shouldBase64Encode(testCase.output);
            const url = new URL("/submissions/", judgeBaseUrl);
            url.searchParams.set("base64_encoded", useBase64 ? "true" : "false");
            url.searchParams.set("wait", waitForResult ? "true" : "false");

            const response = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Judge0-Token": "paitongacs23kodlor",
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
                time?: string | number | null;
                memory?: string | number | null;
                token?: string;
            };

            const statusId = result.status?.id ?? 1;
            const judgeStatus = mapJudge0Status(statusId);
            const timeValue =
                typeof result.time === "number"
                    ? result.time
                    : result.time
                        ? Number(result.time)
                        : null;
            const memoryValue =
                typeof result.memory === "number"
                    ? result.memory
                    : result.memory
                        ? Number(result.memory)
                        : null;
            const rawOutput =
                result.stdout ??
                result.compile_output ??
                result.stderr ??
                null;

            if (!waitForResult && result.token) {
                submissionResults.push({
                    testCaseId: testCase.id,
                    actualOutput: null,
                    passed: false,
                    runtime: null,
                    judgeStatus: "PENDING",
                    memory: null,
                });
                continue;
            }

            submissionResults.push({
                testCaseId: testCase.id,
                actualOutput: decodeIfNeeded(rawOutput, useBase64),
                passed: judgeStatus === "ACCEPTED",
                runtime: timeValue ?? null,
                judgeStatus,
                memory: memoryValue ?? null,
            });
        }
    } catch {
        return NextResponse.json(
            { error: "Failed to submit to Judge0." },
            { status: 502 },
        );
    }

    const statuses = submissionResults.map((result) => result.judgeStatus);
    const finalStatus = pickFinalStatus(statuses);

    const executionTime = submissionResults.reduce<number | null>(
        (maxValue, current) => {
            if (current.runtime === null || Number.isNaN(current.runtime)) {
                return maxValue;
            }
            if (maxValue === null) return current.runtime;
            return Math.max(maxValue, current.runtime);
        },
        null,
    );

    const memoryUsed = submissionResults.reduce<number | null>(
        (maxValue, current) => {
            if (current.memory === null || Number.isNaN(current.memory)) {
                return maxValue;
            }
            if (maxValue === null) return current.memory;
            return Math.max(maxValue, current.memory);
        },
        null,
    );

    await prisma.$transaction([
        prisma.submissionResult.createMany({
            data: submissionResults.map((result) => ({
                submissionId: submission.id,
                testCaseId: result.testCaseId,
                actualOutput: result.actualOutput,
                passed: result.passed,
                runtime: result.runtime,
            })),
        }),
        prisma.submission.update({
            where: { id: submission.id },
            data: {
                status: finalStatus,
                executionTime,
                memoryUsed,
            },
        }),
        prisma.problem.update({
            where: { id: problem.id },
            data: {
                participantCount: { increment: 1 },
                ...(finalStatus === "ACCEPTED"
                    ? { successCount: { increment: 1 } }
                    : {}),
            },
        }),
    ]);

    return NextResponse.json({
        id: submission.id,
        status: finalStatus,
        createdAt: submission.createdAt,
    });
}
