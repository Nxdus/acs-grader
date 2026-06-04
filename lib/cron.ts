import cron from "node-cron";
import { finishExpiredContests } from "./contest/finish";

cron.schedule("*/5 * * * *", async () => {
  await finishExpiredContests();
});
