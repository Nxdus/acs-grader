import ReactMarkdown, { type Components } from "react-markdown"

import { cn } from "@/lib/utils"

interface TaskMarkdownProps {
    content: string
    className?: string
}

const markdownComponents: Components = {
    h1: ({ className, ...props }) => (
        <h1 className={cn("text-2xl font-semibold tracking-tight", className)} {...props} />
    ),
    h2: ({ className, ...props }) => (
        <h2 className={cn("mt-6 text-xl font-semibold tracking-tight", className)} {...props} />
    ),
    h3: ({ className, ...props }) => (
        <h3 className={cn("mt-5 text-lg font-semibold tracking-tight", className)} {...props} />
    ),
    p: ({ className, ...props }) => (
        <p className={cn("text-sm leading-6 text-foreground/90", className)} {...props} />
    ),
    ul: ({ className, ...props }) => (
        <ul className={cn("ml-5 list-disc space-y-1 text-sm", className)} {...props} />
    ),
    ol: ({ className, ...props }) => (
        <ol className={cn("ml-5 list-decimal space-y-1 text-sm", className)} {...props} />
    ),
    li: ({ className, ...props }) => (
        <li className={cn("leading-6 text-foreground/90", className)} {...props} />
    ),
    a: ({ className, ...props }) => (
        <a
            className={cn("text-primary underline-offset-4 hover:underline", className)}
            target="_blank"
            rel="noreferrer"
            {...props}
        />
    ),
    blockquote: ({ className, ...props }) => (
        <blockquote
            className={cn("border-l-2 border-border pl-4 text-sm text-muted-foreground", className)}
            {...props}
        />
    ),
    code: ({ className, ...props }) => {
        const isBlock = typeof className === "string" && className.includes("language-")
        return (
            <code
                className={cn(
                    isBlock
                        ? "font-mono text-xs"
                        : "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground",
                    className,
                )}
                {...props}
            />
        )
    },
    pre: ({ className, ...props }) => (
        <pre
            className={cn(
                "mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground",
                className,
            )}
            {...props}
        />
    ),
    table: ({ className, ...props }) => (
        <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    ),
    th: ({ className, ...props }) => (
        <th className={cn("border-b px-2 py-2 text-left font-medium", className)} {...props} />
    ),
    td: ({ className, ...props }) => (
        <td className={cn("border-b px-2 py-2 align-top", className)} {...props} />
    ),
}

export default function TaskMarkdown({ content, className }: TaskMarkdownProps) {
    return (
        <div className={cn("h-full w-full overflow-auto bg-background p-6", className)}>
            <ReactMarkdown components={markdownComponents}>
                {content}
            </ReactMarkdown>
        </div>
    )
}
