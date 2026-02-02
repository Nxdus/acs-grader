import { NextResponse } from "next/server"

type GenerateRequest = {
  description?: string
  constraints?: string
  inputFormat?: string
  outputFormat?: string
  count?: number
  existingTestCases?: Array<{ input?: string; output?: string; isSample?: boolean }>
}

const DEFAULT_MODEL = "qwen/qwen-2.5-7b-instruct:free"
const DEFAULT_FALLBACK_MODEL = "liquid/lfm-2.5-1.2b-instruct:free"
const DEFAULT_COUNT = 5
const MAX_COUNT = 50
const MAX_CHUNK = 2
const MAX_ATTEMPTS_PER_CHUNK = 5
const OPENROUTER_TIMEOUT_MS = 20000

type RateLimitInfo = {
  retryAfter?: number
  resetAt?: string
}

function parseRateLimitInfo(response: Response, bodyText: string | null): RateLimitInfo {
  const headerRetry = Number(response.headers.get("retry-after") ?? "")
  let resetAt: string | undefined
  let retryAfter: number | undefined = Number.isFinite(headerRetry) ? headerRetry : undefined

  try {
    const parsed = bodyText ? (JSON.parse(bodyText) as {
      error?: { metadata?: { headers?: Record<string, string> } }
    }) : null
    const headers = parsed?.error?.metadata?.headers
    const resetHeader = headers?.["X-RateLimit-Reset"] ?? headers?.["x-ratelimit-reset"]
    if (resetHeader) {
      const resetMs = Number(resetHeader)
      if (Number.isFinite(resetMs)) {
        resetAt = new Date(resetMs).toISOString()
        if (!retryAfter) {
          const delta = Math.max(0, Math.ceil((resetMs - Date.now()) / 1000))
          retryAfter = delta
        }
      }
    }
  } catch {
    // ignore parse errors
  }

  return { retryAfter, resetAt }
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function normalizeCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_COUNT
  return Math.max(1, Math.min(MAX_COUNT, Math.floor(value)))
}

type ModelCapabilities = {
  isReasoningModel: boolean
  supportsResponseFormat: boolean
}

function isFreeModel(model: string) {
  const normalized = model.toLowerCase()
  return normalized.includes(":free") || normalized.includes("/free")
}

function getModelCapabilities(model: string): ModelCapabilities {
  const normalized = model.toLowerCase()
  const isReasoningModel = /(deepseek-?r1|r1\b|reasoning)/i.test(normalized)
  const supportsResponseFormat = !/(claude-?2|claude-?instant|llama-?2)/i.test(normalized)
  return { isReasoningModel, supportsResponseFormat }
}

function extractJson(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return null
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const source = fenced?.[1]?.trim() ?? trimmed

  const testCasesIndex = source.indexOf("\"testCases\"")
  if (testCasesIndex !== -1) {
    const arrayStart = source.indexOf("[", testCasesIndex)
    if (arrayStart !== -1) {
      const arraySlice = extractFirstJsonValue(source, arrayStart)
      if (arraySlice) {
        try {
          const arr = JSON.parse(arraySlice)
          if (Array.isArray(arr)) {
            return JSON.stringify({ testCases: arr })
          }
        } catch {
          return null
        }
      }
    }
  }

  const firstArray = source.indexOf("[")
  const firstObject = source.indexOf("{")
  const start =
    firstObject === -1 ? firstArray : firstArray === -1 ? firstObject : Math.min(firstArray, firstObject)
  if (start === -1) return null

  const valueSlice = extractFirstJsonValue(source, start)
  if (!valueSlice) return null
  if (valueSlice.startsWith("[")) {
    try {
      return JSON.stringify({ testCases: JSON.parse(valueSlice) })
    } catch {
      return null
    }
  }
  return valueSlice
}

function extractFirstJsonValue(source: string, start: number) {
  let inString = false
  let escaped = false
  let depth = 0
  for (let i = start; i < source.length; i += 1) {
    const char = source[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === "\"") {
        inString = false
      }
      continue
    }
    if (char === "\"") {
      inString = true
      continue
    }
    if (char === "{" || char === "[") {
      depth += 1
    } else if (char === "}" || char === "]") {
      depth -= 1
      if (depth === 0) {
        return source.slice(start, i + 1).trim()
      }
    }
  }
  return null
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY." },
        { status: 500 },
      )
    }

    const body = (await request.json()) as GenerateRequest
    const description = normalizeText(body?.description)
    const constraints = normalizeText(body?.constraints)
    const inputFormat = normalizeText(body?.inputFormat)
    const outputFormat = normalizeText(body?.outputFormat)
    const count = normalizeCount(body?.count)

    if (!description || !constraints || !inputFormat || !outputFormat) {
      return NextResponse.json(
        { error: "Description, constraints, input format, and output format are required." },
        { status: 400 },
      )
    }

    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL
    const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODEL
    if (!isFreeModel(model) || !isFreeModel(fallbackModel)) {
      return NextResponse.json(
        { error: "Paid OpenRouter models are not allowed for this endpoint." },
        { status: 400 },
      )
    }
    const modelCapabilities = getModelCapabilities(model)
    const fallbackCapabilities = getModelCapabilities(fallbackModel)
    const existing = Array.isArray(body?.existingTestCases)
      ? body.existingTestCases
          .map((entry) => ({
            input: normalizeText(entry?.input),
            output: normalizeText(entry?.output),
            isSample: Boolean(entry?.isSample),
          }))
          .filter((entry) => entry.input && entry.output)
      : []

    async function requestChunk(requestCount: number, existingList: typeof existing) {
      const trimmedExisting = existingList.slice(-10)
      const existingSection = trimmedExisting.length
        ? [
            "",
            "Existing test case inputs (do NOT repeat or closely match these):",
            ...trimmedExisting.map(
              (entry, index) =>
                `#${index + 1}\nINPUT:\n${entry.input}`,
            ),
          ].join("\n")
        : ""

      const basePrompt = [
        "You generate programming problem test cases. Obey exactly.",
        `Output ONLY ONE JSON object: {"testCases":[{"input":"...","output":"...","isSample":false}]}`,
        `Generate exactly ${requestCount} NEW test cases. No extras.`,
        "No duplicates or near-duplicates of existing inputs.",
        "JSON must be valid and complete. No markdown, no prose, no reasoning.",
        "Put the JSON in the content field only. Do NOT use a reasoning field.",
        "Keep cases small (prefer n <= 6).",
        "",
        "Description:",
        description,
        "",
        "Constraints:",
        constraints,
        "",
        "Input Format:",
        inputFormat,
        "",
        "Output Format:",
        outputFormat,
        existingSection,
      ]

      const attempts = [
        basePrompt,
        [
          ...basePrompt,
          "",
          "STRICT MODE: Output only JSON in content. No reasoning. If you cannot, output {\"testCases\":[]}.",
        ],
      ]

      let parsed: {
        testCases?: Array<{ input?: string; output?: string; isSample?: boolean }>
      } | null = null
      let lastError: string | null = null
      let lastRateLimit: RateLimitInfo | null = null

      const modelPlan = [
        { name: model, capabilities: modelCapabilities },
        ...(model === fallbackModel
          ? []
          : [{ name: fallbackModel, capabilities: fallbackCapabilities }]),
      ]

      for (const attempt of attempts) {
        const prompt = attempt.join("\n")
        for (const modelEntry of modelPlan) {
          let response: Response
          try {
            response = await fetchWithTimeout(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
                  "X-Title": process.env.OPENROUTER_APP_NAME ?? "acs-grader",
                },
                body: JSON.stringify({
                  model: modelEntry.name,
                  temperature: 0,
                  max_tokens: 700,
                  provider: {
                    data_collection: "allow",
                  },
                  ...(modelEntry.capabilities.supportsResponseFormat
                    ? { response_format: { type: "json_object" } }
                    : {}),
                  messages: [
                    {
                      role: "system",
                      content:
                        "You must return JSON only in the content field. Do not include markdown, backticks, or extra text.",
                    },
                    { role: "user", content: prompt },
                  ],
                }),
              },
              OPENROUTER_TIMEOUT_MS,
            )
          } catch (err) {
            const message =
              err instanceof Error && err.name === "AbortError"
                ? "OpenRouter request timed out."
                : "OpenRouter request failed."
            console.error("OpenRouter fetch failed:", err)
            lastError = message
            continue
          }

          if (!response.ok) {
            const message = await response.text().catch(() => "")
            if (response.status === 429) {
              const rateInfo = parseRateLimitInfo(response, message)
              lastRateLimit = rateInfo
              lastError = "OpenRouter rate limit exceeded."
              console.error("OpenRouter rate limit response:", message)
              break
            }
            if (response.status === 504 || response.status === 408) {
              lastError = "OpenRouter request timed out."
              console.error("OpenRouter timeout response:", message)
              continue
            }
            console.error("OpenRouter error response:", message)
            lastError = message || "OpenRouter request failed."
            continue
          }

          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string; reasoning?: string } }>
          }
          console.log("OpenRouter raw response:", JSON.stringify(data))
          const firstChoice = data?.choices?.[0]
          const content = firstChoice?.message?.content ?? ""
          const reasoning = firstChoice?.message?.reasoning ?? ""
          const fallbackText = (firstChoice as { text?: string })?.text ?? ""
          console.log("OpenRouter raw content:", content)
          if (!content && reasoning) {
            lastError = "Model returned reasoning-only output. Content was empty."
            console.error("OpenRouter reasoning-only output detected.")
            continue
          }

          const jsonPayload = extractJson(content) ?? extractJson(fallbackText)
          if (!jsonPayload) {
            console.error("OpenRouter JSON extraction failed. Raw content:", content)
            lastError = content
              ? "Invalid OpenRouter response format."
              : "Empty OpenRouter response content."
            continue
          }

          try {
            parsed = JSON.parse(jsonPayload)
            break
          } catch (err) {
            console.error("OpenRouter JSON parse failed:", err)
            lastError = "Generated JSON was not valid. Please try again."
          }
        }
        if (lastRateLimit) {
          break
        }
        if (parsed) break
      }

      if (!parsed) {
        return {
          error: lastError ?? "OpenRouter request failed.",
          rateLimit: Boolean(lastRateLimit),
          retryAfter: lastRateLimit?.retryAfter,
          resetAt: lastRateLimit?.resetAt,
        }
      }

      const testCases = Array.isArray(parsed?.testCases)
        ? parsed.testCases
            .map((entry) => ({
              input: normalizeText(entry?.input),
              output: normalizeText(entry?.output),
              isSample: Boolean(entry?.isSample),
            }))
            .filter((entry) => entry.input && entry.output)
        : []

      if (testCases.length === 0) {
        return { error: "No valid test cases generated." }
      }
      if (testCases.length !== requestCount) {
        return {
          error: `Expected ${requestCount} test cases but got ${testCases.length}.`,
        }
      }

      return { testCases }
    }

    const all: Array<{ input: string; output: string; isSample: boolean }> = []
    let remaining = count
    const failedChunks: Array<{ count: number; error: string }> = []
    while (remaining > 0) {
      const chunkCount = Math.min(MAX_CHUNK, remaining)
      let attempts = 0
      let result = await requestChunk(chunkCount, [...existing, ...all])
      while ("error" in result && attempts < MAX_ATTEMPTS_PER_CHUNK) {
        if (result.rateLimit) {
          return NextResponse.json(
            {
              error: result.error ?? "OpenRouter rate limit exceeded.",
              retryAfter: result.retryAfter,
              resetAt: result.resetAt,
            },
            { status: 429 },
          )
        }
        attempts += 1
        result = await requestChunk(chunkCount, [...existing, ...all])
      }
      if ("error" in result && result.rateLimit) {
        return NextResponse.json(
          {
            error: result.error ?? "OpenRouter rate limit exceeded.",
            retryAfter: result.retryAfter,
            resetAt: result.resetAt,
          },
          { status: 429 },
        )
      }
      if ("error" in result) {
        if (chunkCount > 1) {
          for (let i = 0; i < chunkCount; i += 1) {
            let singleResult = await requestChunk(1, [...existing, ...all])
            let singleAttempts = 0
            while ("error" in singleResult && singleAttempts < MAX_ATTEMPTS_PER_CHUNK) {
              if (singleResult.rateLimit) {
                return NextResponse.json(
                  {
                    error: singleResult.error ?? "OpenRouter rate limit exceeded.",
                    retryAfter: singleResult.retryAfter,
                    resetAt: singleResult.resetAt,
                  },
                  { status: 429 },
                )
              }
              singleAttempts += 1
              singleResult = await requestChunk(1, [...existing, ...all])
            }
            if ("error" in singleResult && singleResult.rateLimit) {
              return NextResponse.json(
                {
                  error: singleResult.error ?? "OpenRouter rate limit exceeded.",
                  retryAfter: singleResult.retryAfter,
                  resetAt: singleResult.resetAt,
                },
                { status: 429 },
              )
            }
            if ("error" in singleResult) {
              failedChunks.push({
                count: 1,
                error: singleResult.error ?? "OpenRouter request failed.",
              })
              continue
            }
            all.push(...singleResult.testCases)
          }
          remaining -= chunkCount
          continue
        }
        failedChunks.push({
          count: chunkCount,
          error: result.error ?? "OpenRouter request failed.",
        })
        remaining -= chunkCount
        continue
      }
      all.push(...result.testCases)
      remaining -= chunkCount
    }

    if (all.length === 0) {
      return NextResponse.json(
        {
          error: "OpenRouter request failed.",
          detail: failedChunks[0]?.error ?? "No test cases generated.",
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      testCases: all,
      warnings: failedChunks.length > 0 ? failedChunks : undefined,
    })
  } catch (error) {
    console.error("Failed to generate testcases:", error)
    return NextResponse.json(
      { error: "Failed to generate testcases." },
      { status: 500 },
    )
  }
}
