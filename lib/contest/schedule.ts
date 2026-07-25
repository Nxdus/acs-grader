export type ContestStatus = "active" | "upcoming" | "ended";

type ContestScheduleInput = {
  startAt: Date | string;
  endAt: Date | string;
  status: ContestStatus;
  serverTime: Date | string;
};

const MAX_TIMEOUT_MS = 2_147_000_000;
const REFRESH_BUFFER_MS = 250;

export function getContestStatus(
  startAt: Date | string,
  endAt: Date | string,
  now = new Date(),
): ContestStatus {
  const nowTime = now.getTime();
  const startTime = new Date(startAt).getTime();
  const endTime = new Date(endAt).getTime();

  if (nowTime < startTime) return "upcoming";
  if (nowTime >= endTime) return "ended";
  return "active";
}

export function getContestSchedule(
  startAt: Date | string,
  endAt: Date | string,
  now = new Date(),
) {
  return {
    status: getContestStatus(startAt, endAt, now),
    serverTime: now.toISOString(),
  };
}

export function getScheduleRefreshDelay(
  contests: ContestScheduleInput[],
): number | null {
  let nextDelay = Number.POSITIVE_INFINITY;

  for (const contest of contests) {
    if (contest.status === "ended") continue;

    const serverTime = new Date(contest.serverTime).getTime();
    const transitionTime = new Date(
      contest.status === "upcoming" ? contest.startAt : contest.endAt,
    ).getTime();

    if (Number.isNaN(serverTime) || Number.isNaN(transitionTime)) continue;

    nextDelay = Math.min(
      nextDelay,
      Math.max(transitionTime - serverTime + REFRESH_BUFFER_MS, REFRESH_BUFFER_MS),
    );
  }

  if (!Number.isFinite(nextDelay)) return null;
  return Math.min(nextDelay, MAX_TIMEOUT_MS);
}
