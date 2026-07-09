# K6 load testing

Default target is production read-only traffic:

```bash
npm run load:test
```

Use a verified test user's real Better Auth session cookie for authenticated scenarios. Do not commit cookies to the repo.

```bash
k6 run -e AUTH_COOKIE="better-auth.session_token=..." tests/k6/acs-load-test.js
```

To get the cookie, sign in as the test user, open browser DevTools, go to Application > Cookies > `https://acs.nxdus.space`, and copy the Better Auth session cookie as `name=value`. Multiple users can be passed as comma-separated `AUTH_COOKIES`.

Judge0/write paths are opt-in and should only target a test problem/account:

```bash
k6 run -e AUTH_COOKIE="better-auth.session_token=..." -e PROBLEM_SLUG="test-problem" -e ENABLE_RUN=true tests/k6/acs-load-test.js
k6 run -e AUTH_COOKIE="better-auth.session_token=..." -e PROBLEM_SLUG="test-problem" -e ENABLE_SUBMIT=true tests/k6/acs-load-test.js
```

Optional write scenarios run once by default. Increase with `-e WRITE_ITERATIONS=10` only when the test account/problem is safe to write to.

## Judge0 capacity test

Use the dedicated script when the goal is to find the Judge0/App limit. Start low on production and increase `MAX_VUS` only after watching server metrics.

```bash
k6 run -e PROBLEM_SLUG="prime-checker" -e JUDGE_ENDPOINT=run -e MAX_VUS=20 tests/k6/judge0-capacity-test.js
```

For authenticated submit capacity, use a test account and expect database writes:

```bash
k6 run -e AUTH_COOKIE="better-auth.session_token=..." -e PROBLEM_SLUG="prime-checker" -e JUDGE_ENDPOINT=submit -e MAX_VUS=10 tests/k6/judge0-capacity-test.js
```

Useful knobs:

- `MAX_VUS`: highest concurrent virtual users to ramp to.
- `STEP_DURATION`: hold time per step, default `2m`.
- `SLEEP_SECONDS`: pause after each judge request, default `1`.
- `ABORT_ERROR_RATE`: stop when failures exceed this rate, default `0.05`.
- `ABORT_P95_MS`: stop when Judge0 p95 exceeds this value, default `30000`.
- `ABORT_P99_MS`: stop when Judge0 p99 exceeds this value, default `45000`.
