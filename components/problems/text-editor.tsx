"use client"

import MonacoEditor, { Monaco, OnChange, OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorType } from "monaco-editor";

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

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "next-themes";

export default function TextEditor() {

    const allowedLanguageIds: number[] = [];
    const [languages, setLanguages] = useState<Array<{ id: number; name: string; monacoId: string }>>([]);
    const [languageId, setLanguageId] = useState("");

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
                const response = await fetch("http://localhost:2358/languages");
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

    const visibleLanguages = allowedLanguageIds.length
        ? languages.filter((item) => allowedLanguageIds.includes(item.id))
        : languages;

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

    return (
        <div className={`w-full h-full flex flex-col items-end gap-2 bg-[#fffffe] dark:bg-[#1e1e1e] p-2`}>
            <div className="inline-flex gap-2">
                <ButtonGroup>
                    <Button variant={"secondary"} size={"icon"}> <Play /></Button>
                    <Button variant={"default"}>Submit</Button>
                </ButtonGroup>
                <Select value={languageId} onValueChange={setLanguageId}>
                    <SelectTrigger className="w-48" >
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

            <MonacoEditor
                theme={theme === "dark" ? "vs-dark" : "vs-light"}
                language={editorLanguage}
                loading={<Spinner />}
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
