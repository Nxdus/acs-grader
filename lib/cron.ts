import cron from "node-cron";
import { finishExpiredContests } from "./contest/finish";

cron.schedule("*/5 * * * *", async () => {
  try {
    finishExpiredContests();
  } catch (err) {
    console.error("Cron error:", err);
  }
});
