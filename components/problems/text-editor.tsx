"use client"

import MonacoEditor from "@monaco-editor/react";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    ButtonGroup,
} from "@/components/ui/button-group"

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "next-themes";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TextEditorProps = {
    slug: string;
    allowedLanguageIds?: number[];
};

export default function TextEditor({ slug, allowedLanguageIds = [] }: TextEditorProps) {

    const [languages, setLanguages] = useState<Array<{ id: number; name: string; monacoId: string }>>([]);
    const [languageId, setLanguageId] = useState("");
    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const { data: session } = useSession();
    const [submissionStatus, setSubmissionStatus] = useState<{
        hasSubmission: boolean;
        status?: string;
        executionTime?: number | null;
        memoryUsed?: number | null;
        createdAt?: string;
    } | null>(null);

    const statusLabel = (status?: string) => {
        switch (status) {
            case "ACCEPTED":
                return "Accepted";
            case "WRONG_ANSWER":
                return "Wrong Answer";
            case "TIME_LIMIT_EXCEEDED":
                return "Time Limit";
            case "RUNTIME_ERROR":
                return "Runtime Error";
            case "COMPILATION_ERROR":
                return "Compilation Error";
            case "INTERNAL_ERROR":
                return "Internal Error";
            case "EXEC_FORMAT_ERROR":
                return "Exec Format Error";
            case "MEMORY_LIMIT_EXCEEDED":
                return "Memory Limit";
            case "OUTPUT_LIMIT_EXCEEDED":
                return "Output Limit";
            case "STORAGE_LIMIT_EXCEEDED":
                return "Storage Limit";
            case "PENDING":
                return "Pending";
            default:
                return "Unknown";
        }
    };

    const formatSeconds = (value?: number | null) => {
        if (value === null || value === undefined || Number.isNaN(value)) return null;
        return `${value.toFixed(3)}s`;
    };

    const formatMemory = (value?: number | null) => {
        if (value === null || value === undefined || Number.isNaN(value)) return null;
        if (value >= 1024) return `${(value / 1024).toFixed(2)} MB`;
        return `${value.toFixed(0)} KB`;
    };

    useEffect(() => {
        let cancelled = false;

        const mapMonacoLanguage = (name: string) => {
            const baseName = name.split(" (")[0]?.trim().toLowerCase();
            const mapping: Record<string, string> = {
                "assembly": "asm",
                "bash": "shell",
                "basic": "vb",
                "c": "c",
                "c++": "cpp",
                "c#": "csharp",
                "clojure": "clojure",
                "cobol": "cobol",
                "common lisp": "lisp",
                "d": "d",
                "elixir": "elixir",
                "erlang": "erlang",
                "f#": "fsharp",
                "fortran": "fortran",
                "go": "go",
                "groovy": "groovy",
                "haskell": "haskell",
                "java": "java",
                "javascript": "javascript",
                "kotlin": "kotlin",
                "lua": "lua",
                "objective-c": "objective-c",
                "ocaml": "ocaml",
                "octave": "octave",
                "pascal": "pascal",
                "perl": "perl",
                "php": "php",
                "plain text": "plaintext",
                "prolog": "prolog",
                "python": "python",
                "r": "r",
                "ruby": "ruby",
                "rust": "rust",
                "scala": "scala",
                "sql": "sql",
                "swift": "swift",
                "typescript": "typescript",
                "visual basic.net": "vb",
            };

            if (baseName && mapping[baseName]) {
                return mapping[baseName];
            }

            return "plaintext";
        };

        const loadLanguages = async () => {
            try {
                const response = await fetch("https://judge.nxdus.space/languages", {
                    headers: { "X-Judge0-Token": "paitongacs23kodlor" },
                });
                if (!response.ok) {
                    throw new Error(`Failed to load languages: ${response.status}`);
                }

                const data = (await response.json()) as Array<{ id: number; name: string }>;
                if (cancelled) return;

                const options = data.map((item) => ({
                    ...item,
                    monacoId: mapMonacoLanguage(item.name),
                }));

                setLanguages(options);
            } catch (error) {
                console.error(error);
            }
        };

        loadLanguages();

        return () => {
            cancelled = true;
        };
    }, []);

    const visibleLanguages = languages.filter((item) =>
        allowedLanguageIds.includes(item.id),
    );

    useEffect(() => {
        if (!visibleLanguages.length) {
            setLanguageId("");
            return;
        }

        const isAllowed = visibleLanguages.some((item) => String(item.id) === languageId);
        if (!isAllowed) {
            setLanguageId(String(visibleLanguages[0].id));
        }
    }, [languageId, visibleLanguages]);

    const selectedLanguage = visibleLanguages.find((item) => String(item.id) === languageId);
    const editorLanguage = selectedLanguage?.monacoId ?? "plaintext";

    const { theme } = useTheme()

    const canSubmit = useMemo(() => {
        return Boolean(
            session?.user?.id &&
            code.trim().length > 0 &&
            selectedLanguage &&
            languageId,
        );
    }, [code, languageId, selectedLanguage, session?.user?.id]);

    const canRun = useMemo(() => {
        return Boolean(
            code.trim().length > 0 &&
            selectedLanguage &&
            languageId,
        );
    }, [code, languageId, selectedLanguage]);

    const handleSubmit = async () => {
        if (!session?.user?.id) {
            toast.error("Please sign in before submitting.");
            return;
        }

        if (!selectedLanguage || !languageId) {
            toast.error("Please select a language.");
            return;
        }

        if (!code.trim()) {
            toast.error("Please enter your code.");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/tasks/${slug}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: session.user.id,
                    languageId: Number(languageId),
                    language: selectedLanguage.name,
                    code,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage =
                    typeof data?.error === "string" ? data.error : "Submission failed.";
                toast.error(errorMessage);
                return;
            }

            toast.success("Submitted successfully.");
            void loadSubmissionStatus(session.user.id);
        } catch (error) {
            console.error(error);
            toast.error("Unable to submit right now.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRun = async () => {
        if (!selectedLanguage || !languageId) {
            toast.error("Please select a language.");
            return;
        }

        if (!code.trim()) {
            toast.error("Please enter your code.");
            return;
        }

        setIsRunning(true);
        window.dispatchEvent(new CustomEvent("testcase-run-start"));

        try {
            const response = await fetch(`/api/tasks/${slug}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    languageId: Number(languageId),
                    code,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage =
                    typeof data?.error === "string" ? data.error : "Run failed.";
                toast.error(errorMessage);
                return;
            }

            if (Array.isArray(data?.results)) {
                window.dispatchEvent(
                    new CustomEvent("testcase-run-complete", {
                        detail: { results: data.results },
                    }),
                );
                toast.success("Testcases checked.");
            } else {
                toast.error("No testcase results received.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Unable to run right now.");
        } finally {
            setIsRunning(false);
        }
    };

    const loadSubmissionStatus = useCallback(async (userId: string) => {
        try {
            const response = await fetch(
                `/api/tasks/${slug}/status?userId=${encodeURIComponent(userId)}`,
            );
            const data = await response.json();
            if (!response.ok) {
                setSubmissionStatus(null);
                return;
            }
            setSubmissionStatus(data);
        } catch (error) {
            console.error(error);
        }
    }, [slug]);

    useEffect(() => {
        if (!session?.user?.id) {
            setSubmissionStatus(null);
            return;
        }
        void loadSubmissionStatus(session.user.id);
    }, [loadSubmissionStatus, session?.user?.id]);

    return (
        <div className={`w-full h-full flex flex-col items-end gap-2 bg-[#fffffe] dark:bg-[#1e1e1e] p-2`}>
            <div className="w-full flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                    {session?.user?.id ? (
                        submissionStatus?.hasSubmission ? (
                            <>
                                <Badge
                                    className={cn(
                                        "text-[11px] font-semibold uppercase tracking-wide",
                                        submissionStatus.status === "ACCEPTED"
                                            ? "bg-emerald-500/10 text-emerald-600"
                                            : submissionStatus.status === "PENDING"
                                                ? "bg-amber-500/10 text-amber-600"
                                                : "bg-rose-500/10 text-rose-600",
                                    )}
                                >
                                    {statusLabel(submissionStatus.status)}
                                </Badge>
                                {formatSeconds(submissionStatus.executionTime) ? (
                                    <Badge variant="secondary">
                                        Time: {formatSeconds(submissionStatus.executionTime)}
                                    </Badge>
                                ) : null}
                                {formatMemory(submissionStatus.memoryUsed) ? (
                                    <Badge variant="secondary">
                                        Memory: {formatMemory(submissionStatus.memoryUsed)}
                                    </Badge>
                                ) : null}
                            </>
                        ) : (
                            <Badge variant="outline">No submission yet</Badge>
                        )
                    ) : null}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <ButtonGroup>
                        <Button
                            variant={"secondary"}
                            size={"icon"}
                            onClick={handleRun}
                            disabled={!canRun || isRunning}
                        >
                            <Play />
                        </Button>
                        <Button
                            variant={"default"}
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                    </ButtonGroup>
                    <Select value={languageId} onValueChange={setLanguageId}>
                        <SelectTrigger className="w-full sm:w-48" >
                            <SelectValue placeholder="Select a languages" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Languages</SelectLabel>
                                {visibleLanguages.map((item) => (
                                    <SelectItem key={item.id} value={String(item.id)}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <MonacoEditor
                theme={theme === "dark" ? "vs-dark" : "vs-light"}
                language={editorLanguage}
                loading={<Spinner />}
                onChange={(value) => setCode(value ?? "")}
                options={{
                    acceptSuggestionOnCommitCharacter: true,
                    acceptSuggestionOnEnter: "on",
                    accessibilitySupport: "auto",
                    accessibilityPageSize: 10,
                    ariaLabel: "Editor content",
                    screenReaderAnnounceInlineSuggestion: true,
                    autoClosingBrackets: "languageDefined",
                    autoClosingComments: "languageDefined",
                    autoClosingDelete: "auto",
                    autoClosingOvertype: "auto",
                    autoClosingQuotes: "languageDefined",
                    autoIndent: "full",
                    autoSurround: "languageDefined",
                    bracketPairColorization: {
                        enabled: true,
                        independentColorPoolPerBracketType: false,
                    },
                    stickyTabStops: false,
                    codeLens: true,
                    colorDecorators: true,
                    columnSelection: false,
                    contextmenu: true,
                    copyWithSyntaxHighlighting: true,
                    cursorBlinking: "blink",
                    cursorSmoothCaretAnimation: "off",
                    cursorStyle: "line",
                    cursorSurroundingLines: 0,
                    cursorSurroundingLinesStyle: "default",
                    dragAndDrop: true,
                    emptySelectionClipboard: true,
                    fontSize: 14,
                    fontWeight: "normal",
                    glyphMargin: true,
                    lineNumbers: "on",
                    lineNumbersMinChars: 5,
                    matchBrackets: "always",
                    minimap: {
                        enabled: true,
                        side: "right",
                        scale: 1,
                        renderCharacters: true,
                        maxColumn: 120,
                    },
                    mouseStyle: "text",
                    multiCursorModifier: "alt",
                    occurrencesHighlight: "singleFile",
                    overviewRulerBorder: true,
                    padding: {
                        top: 16,
                        bottom: 16,
                    },
                    quickSuggestions: {
                        other: "on",
                        comments: "off",
                        strings: "off",
                    },
                    readOnly: false,
                    renderControlCharacters: true,
                    renderFinalNewline: "on",
                    renderLineHighlight: "line",
                    renderWhitespace: "selection",
                    scrollBeyondLastLine: false,
                    scrollbar: {
                        vertical: "auto",
                        horizontal: "auto",
                        verticalScrollbarSize: 14,
                        horizontalScrollbarSize: 12,
                    },
                    selectOnLineNumbers: true,
                    showFoldingControls: "mouseover",
                    smoothScrolling: false,
                    tabSize: 2,
                    wordWrap: "off",
                    wordWrapColumn: 80,
                    wrappingIndent: "same",
                    automaticLayout: true,
                }}
            />
        </div>
    )
}
