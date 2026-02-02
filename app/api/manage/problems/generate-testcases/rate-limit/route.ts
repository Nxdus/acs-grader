import { NextResponse } from "next/server"

const DEFAULT_MODEL = "tngtech/deepseek-r1t2-chimera:free"
const DEFAULT_FALLBACK_MODEL = "tngtech/deepseek-r1t2-chimera:free"

type ModelCapabilities = {
  supportsResponseFormat: boolean
}

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

function isFreeModel(model: string) {
  const normalized = model.toLowerCase()
  return normalized.includes(":free") || normalized.includes("/free")
}

function getModelCapabilities(model: string): ModelCapabilities {
  const normalized = model.toLowerCase()
  const supportsResponseFormat = !/(claude-?2|claude-?instant|llama-?2)/i.test(normalized)
  return { supportsResponseFormat }
}

export async function GET() {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY." },
        { status: 500 },
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
    const modelPlan = [
      { name: model, capabilities: getModelCapabilities(model) },
      ...(model === fallbackModel
        ? []
        : [{ name: fallbackModel, capabilities: getModelCapabilities(fallbackModel) }]),
    ]

    for (const modelEntry of modelPlan) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
          max_tokens: 1,
          provider: {
            data_collection: "allow",
          },
          ...(modelEntry.capabilities.supportsResponseFormat
            ? { response_format: { type: "json_object" } }
            : {}),
          messages: [
            {
              role: "system",
              content: "Return a JSON object in the content field only.",
            },
            { role: "user", content: "{\"ok\":true}" },
          ],
        }),
      })

      if (response.status === 429) {
        const message = await response.text().catch(() => "")
        const rateInfo = parseRateLimitInfo(response, message)
        return NextResponse.json(
          {
            limited: true,
            error: "OpenRouter rate limit exceeded.",
            retryAfter: rateInfo.retryAfter,
            resetAt: rateInfo.resetAt,
          },
          { status: 429 },
        )
      }

      if (response.ok) {
        return NextResponse.json({ limited: false })
      }
    }

    return NextResponse.json(
      { error: "Failed to check rate limit." },
      { status: 502 },
    )
  } catch (error) {
    console.error("Failed to check OpenRouter rate limit:", error)
    return NextResponse.json(
      { error: "Failed to check rate limit." },
      { status: 500 },
    )
  }
}
