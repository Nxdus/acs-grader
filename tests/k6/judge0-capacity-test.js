import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "https://acs.nxdus.space").replace(/\/$/, "");
const AUTH_COOKIES = (__ENV.AUTH_COOKIES || __ENV.AUTH_COOKIE || "")
  .split(",")
  .map((cookie) => cookie.trim())
  .filter(Boolean);
const ENDPOINT = __ENV.JUDGE_ENDPOINT || "run";
const PROBLEM_SLUG = __ENV.PROBLEM_SLUG || "prime-checker";
const LANGUAGE_ID = Number(__ENV.LANGUAGE_ID || 50);
const LANGUAGE = __ENV.LANGUAGE || "C";
const SAMPLE_CODE = __ENV.SAMPLE_CODE || defaultSampleCode(PROBLEM_SLUG, LANGUAGE_ID);
const MAX_VUS = Number(__ENV.MAX_VUS || 20);
const STEP_DURATION = __ENV.STEP_DURATION || "2m";
const RAMP_DOWN_DURATION = __ENV.RAMP_DOWN_DURATION || "1m";
const SLEEP_SECONDS = Number(__ENV.SLEEP_SECONDS || 1);
const ABORT_ERROR_RATE = Number(__ENV.ABORT_ERROR_RATE || 0.05);
const ABORT_P95_MS = Number(__ENV.ABORT_P95_MS || 30000);
const ABORT_P99_MS = Number(__ENV.ABORT_P99_MS || 45000);

if (ENDPOINT === "submit" && AUTH_COOKIES.length === 0) {
  fail("JUDGE_ENDPOINT=submit requires AUTH_COOKIE or AUTH_COOKIES.");
}

export const judge_success_rate = new Rate("judge_success_rate");
export const judge_duration = new Trend("judge_duration", true);

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  scenarios: {
    judge0_capacity: {
      executor: "ramping-vus",
      stages: capacityStages(MAX_VUS),
      exec: "judgeCapacity",
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    judge_success_rate: [
      { threshold: `rate>${1 - ABORT_ERROR_RATE}`, abortOnFail: true },
    ],
    judge_duration: [
      { threshold: `p(95)<${ABORT_P95_MS}`, abortOnFail: true },
      { threshold: `p(99)<${ABORT_P99_MS}`, abortOnFail: true },
    ],
  },
};

function capacityStages(maxVus) {
  const targets = [1, 2, 5, 10, 20, 30, 50, 75, 100].filter((target) => target < maxVus);
  targets.push(maxVus);
  return [
    ...targets.map((target) => ({ duration: STEP_DURATION, target })),
    { duration: RAMP_DOWN_DURATION, target: 0 },
  ];
}

function authHeaders() {
  if (AUTH_COOKIES.length === 0) return {};
  const index = (__VU + __ITER) % AUTH_COOKIES.length;
  return { Cookie: AUTH_COOKIES[index] };
}

function defaultSampleCode(problemSlug, languageId) {
  if (problemSlug === "prime-checker" && languageId === 50) {
    return `
#include <stdio.h>

int is_prime(int n) {
  if (n < 2) return 0;
  for (int i = 2; i * i <= n; i++) {
    if (n % i == 0) return 0;
  }
  return 1;
}

int main() {
  int t, n;
  scanf("%d", &t);
  while (t--) {
    scanf("%d", &n);
    printf("%s", is_prime(n) ? "Prime" : "Not Prime");
    if (t) printf("\\n");
  }
  return 0;
}
`;
  }

  return "const fs = require('fs'); const input = fs.readFileSync(0, 'utf8'); console.log(input.trim());";
}

function payload() {
  const basePayload = {
    languageId: LANGUAGE_ID,
    code: SAMPLE_CODE,
  };

  if (ENDPOINT === "submit") {
    return JSON.stringify({
      ...basePayload,
      language: LANGUAGE,
      contestSlug: __ENV.CONTEST_SLUG || undefined,
    });
  }

  return JSON.stringify(basePayload);
}

function endpointPath() {
  const action = ENDPOINT === "submit" ? "submit" : "run";
  return `/api/tasks/${encodeURIComponent(PROBLEM_SLUG)}/${action}`;
}

export function judgeCapacity() {
  const response = http.post(`${BASE_URL}${endpointPath()}`, payload(), {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    tags: {
      kind: "judge_capacity",
      endpoint: ENDPOINT,
    },
    timeout: `${Math.ceil(ABORT_P95_MS / 1000) + 30}s`,
  });

  const ok = response.status >= 200 && response.status < 300;
  judge_success_rate.add(ok);
  judge_duration.add(response.timings.duration);

  check(response, {
    "judge request is 2xx": () => ok,
  });

  if (!ok) {
    console.error(`${ENDPOINT} failed with ${response.status}: ${response.body}`);
  }

  sleep(SLEEP_SECONDS);
}
