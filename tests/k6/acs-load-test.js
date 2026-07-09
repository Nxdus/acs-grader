import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = (__ENV.BASE_URL || "https://acs.nxdus.space").replace(/\/$/, "");
const K6_STAGE = __ENV.K6_STAGE || "smoke";
const AUTH_COOKIES = (__ENV.AUTH_COOKIES || __ENV.AUTH_COOKIE || "")
  .split(",")
  .map((cookie) => cookie.trim())
  .filter(Boolean);
const USER_ID = __ENV.USER_ID || "";
const PROBLEM_SLUG = __ENV.PROBLEM_SLUG || "";
const CONTEST_SLUG = __ENV.CONTEST_SLUG || "";
const ENABLE_RUN = __ENV.ENABLE_RUN === "true";
const ENABLE_SUBMIT = __ENV.ENABLE_SUBMIT === "true";
const WRITE_ITERATIONS = Number(__ENV.WRITE_ITERATIONS || 1);
const LANGUAGE_ID = Number(__ENV.LANGUAGE_ID || 63);
const LANGUAGE = __ENV.LANGUAGE || "JavaScript";
const SAMPLE_CODE = __ENV.SAMPLE_CODE || defaultSampleCode(PROBLEM_SLUG, LANGUAGE_ID);

const stagesByMode = {
  smoke: [{ duration: "1m", target: 1 }],
  load: [
    { duration: "5m", target: 20 },
    { duration: "10m", target: 20 },
    { duration: "2m", target: 0 },
  ],
  stress: [
    { duration: "5m", target: 20 },
    { duration: "5m", target: 50 },
    { duration: "5m", target: 100 },
    { duration: "3m", target: 0 },
  ],
};

const scenarios = {
  public_browse: {
    executor: "ramping-vus",
    stages: stagesByMode[K6_STAGE] || stagesByMode.smoke,
    exec: "publicBrowse",
  },
};

if (AUTH_COOKIES.length > 0) {
  scenarios.authenticated_progress = {
    executor: "constant-vus",
    vus: K6_STAGE === "smoke" ? 1 : 3,
    duration: K6_STAGE === "smoke" ? "1m" : "5m",
    exec: "authenticatedProgress",
  };
}

if (ENABLE_RUN && PROBLEM_SLUG) {
  scenarios.judge_run_optional = {
    executor: "shared-iterations",
    vus: 1,
    iterations: WRITE_ITERATIONS,
    exec: "judgeRun",
  };
}

if (ENABLE_SUBMIT && AUTH_COOKIES.length > 0 && PROBLEM_SLUG) {
  scenarios.submit_optional = {
    executor: "shared-iterations",
    vus: 1,
    iterations: WRITE_ITERATIONS,
    exec: "submitSolution",
  };
}

export const options = {
  scenarios,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:api_read}": ["p(95)<800"],
    "http_req_duration{kind:page}": ["p(95)<2000"],
    ...(ENABLE_RUN || ENABLE_SUBMIT
      ? { "http_req_duration{kind:judge}": ["p(95)<20000"] }
      : {}),
  },
};

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

function logFailure(label, response) {
  if (response.status >= 200 && response.status < 300) return;
  console.error(`${label} failed with ${response.status}: ${response.body}`);
}

function getJson(path, tags = {}) {
  const response = http.get(`${BASE_URL}${path}`, { tags });
  check(response, {
    [`GET ${path} is 2xx`]: (res) => res.status >= 200 && res.status < 300,
  });

  try {
    return response.json();
  } catch {
    return null;
  }
}

function pickProblemSlug(tasks) {
  return PROBLEM_SLUG || tasks?.items?.[0]?.slug || "";
}

function pickContestSlug(contests) {
  return CONTEST_SLUG || contests?.[0]?.slug || "";
}

export function publicBrowse() {
  check(http.get(`${BASE_URL}/`, { tags: { kind: "page" } }), {
    "home page is 2xx": (res) => res.status >= 200 && res.status < 300,
  });

  const tasks = getJson("/api/tasks?take=20", { kind: "api_read" });
  const problemSlug = pickProblemSlug(tasks);
  if (problemSlug) getJson(`/api/tasks/${encodeURIComponent(problemSlug)}`, { kind: "api_read" });

  const contests = getJson("/api/contest", { kind: "api_read" });
  const contestSlug = pickContestSlug(contests);
  if (contestSlug) {
    getJson(`/api/contest/${encodeURIComponent(contestSlug)}`, { kind: "api_read" });
    getJson(`/api/contest/${encodeURIComponent(contestSlug)}/leaderboard`, { kind: "api_read" });
  }

  getJson("/api/rankings", { kind: "api_read" });
  sleep(1);
}

export function authenticatedProgress() {
  const params = {
    headers: authHeaders(),
    tags: { kind: "api_read" },
  };

  const tasksPath = USER_ID
    ? `/api/tasks?take=20&userId=${encodeURIComponent(USER_ID)}`
    : "/api/tasks?take=20";
  const tasks = http.get(`${BASE_URL}${tasksPath}`, params);
  check(tasks, {
    "authenticated tasks is not unauthorized": (res) => res.status !== 401,
    "authenticated tasks is 2xx": (res) => res.status >= 200 && res.status < 300,
  });

  if (CONTEST_SLUG) {
    const contestPath = USER_ID
      ? `/api/contest/${encodeURIComponent(CONTEST_SLUG)}?userId=${encodeURIComponent(USER_ID)}`
      : `/api/contest/${encodeURIComponent(CONTEST_SLUG)}`;
    const contest = http.get(`${BASE_URL}${contestPath}`, params);
    check(contest, {
      "authenticated contest is not unauthorized": (res) => res.status !== 401,
      "authenticated contest is 2xx": (res) => res.status >= 200 && res.status < 300,
    });
  }

  sleep(1);
}

export function judgeRun() {
  const payload = JSON.stringify({
    languageId: LANGUAGE_ID,
    code: SAMPLE_CODE,
  });
  const response = http.post(`${BASE_URL}/api/tasks/${encodeURIComponent(PROBLEM_SLUG)}/run`, payload, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    tags: { kind: "judge" },
  });
  logFailure("judge run", response);

  check(response, {
    "judge run is 2xx": (res) => res.status >= 200 && res.status < 300,
  });
  sleep(2);
}

export function submitSolution() {
  const payload = JSON.stringify({
    languageId: LANGUAGE_ID,
    language: LANGUAGE,
    code: SAMPLE_CODE,
    contestSlug: CONTEST_SLUG || undefined,
  });
  const response = http.post(`${BASE_URL}/api/tasks/${encodeURIComponent(PROBLEM_SLUG)}/submit`, payload, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    tags: { kind: "judge" },
  });
  logFailure("submit", response);

  check(response, {
    "submit is not unauthorized": (res) => res.status !== 401,
    "submit is 2xx": (res) => res.status >= 200 && res.status < 300,
  });
  sleep(5);
}
