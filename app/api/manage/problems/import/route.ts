import { NextResponse } from "next/server"
import { FIXED_TEST_CASE_COUNT } from "@/lib/problem-config"

type ImportedTestcaseFile = {
  version?: unknown
  testCases?: unknown
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function normalizeTestCases(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const input = normalizeString((entry as { input?: unknown }).input)
      const output = normalizeString((entry as { output?: unknown }).output)
      const isSample =
        typeof (entry as { isSample?: unknown }).isSample === "boolean"
          ? (entry as { isSample?: boolean }).isSample
          : false
      if (!input || !output) return null
      return { input, output, isSample }
    })
    .filter((entry): entry is { input: string; output: string; isSample: boolean } => Boolean(entry))
}

function buildTemplate() {
  return {
    version: 1,
    testCases: Array.from({ length: FIXED_TEST_CASE_COUNT }, (_, index) => ({
      input: `2 ${index + 1}\n0 ${index + 1}\n`,
      output: "0 1\n",
      isSample: index < 2,
    })),
  }
}

export async function GET() {
  const body = JSON.stringify(buildTemplate(), null, 2)
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="testcase-import-template.json"',
    },
  })
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Testcase import file is required." }, { status: 400 })
    }

    const text = await file.text()
    let parsed: ImportedTestcaseFile
    try {
      parsed = JSON.parse(text) as ImportedTestcaseFile
    } catch {
      return NextResponse.json({ error: "Uploaded file is not valid JSON." }, { status: 400 })
    }

    if (Number(parsed?.version) !== 1) {
      return NextResponse.json({ error: "Unsupported import file version." }, { status: 400 })
    }

    const testCases = normalizeTestCases(parsed.testCases)

    if (testCases.length !== FIXED_TEST_CASE_COUNT) {
      return NextResponse.json(
        { error: `Import file must contain exactly ${FIXED_TEST_CASE_COUNT} valid test cases.` },
        { status: 400 },
      )
    }

    return NextResponse.json({ testCases })
  } catch (error) {
    console.error("Failed to import testcases:", error)
    return NextResponse.json({ error: "Failed to import testcases." }, { status: 500 })
  }
}
