import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface TestcaseRow {
    input: string
    output: string
}

interface TestcaseTableProps {
    rows: TestcaseRow[]
    className?: string
}

export default function TestcaseTable({ rows, className }: TestcaseTableProps) {
    return (
        <div className={cn("h-full w-full overflow-auto bg-background p-6", className)}>
            <div className="mb-3 text-sm font-medium">Testcases</div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/2">Input</TableHead>
                        <TableHead className="w-1/2">Output</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={`${index}-${row.input}`}>
                            <TableCell className="align-top whitespace-pre-wrap font-mono text-xs">
                                {row.input}
                            </TableCell>
                            <TableCell className="align-top whitespace-pre-wrap font-mono text-xs">
                                {row.output}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
