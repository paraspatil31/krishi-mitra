import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import app from "./app";
import { connectDB } from "./config/db";
import { MandiService } from "./services/mandi.service";
import { WeatherService } from "./services/weather.service";
import { ensureStorageSeedData } from "./services/storage.service";
import { marketService } from "./services/market.service";

const PORT = process.env.PORT || 5000;

function setupMandiCronJob(): void {
  const intervalHours = process.env.MANDI_REFRESH_INTERVAL_HOURS
    ? parseInt(process.env.MANDI_REFRESH_INTERVAL_HOURS, 10)
    : 24;

  let cronSchedule = "30 5 * * *";
  if (intervalHours > 0 && intervalHours < 24) {
    cronSchedule = `0 */${intervalHours} * * *`;
  }

  cron.schedule(cronSchedule, async () => {
    console.log("[Scheduler] Triggering scheduled Data.gov.in Agmarknet mandi synchronization...");
    try {
      const res = await MandiService.refreshRates(true);
      console.log(`[Scheduler] Scheduled mandi sync complete: ${res.count} records processed.`);
    } catch (cronErr: any) {
      console.error("[Scheduler] Mandi scheduled job error:", cronErr.message);
    }
  });

  console.log(`[Scheduler] Scheduled Mandi rate synchronization cron registered ('${cronSchedule}')`);
}

function setupWeatherCronJob(): void {
  // Run meteorological forecast and alert threshold analysis twice daily (06:00 AM & 06:00 PM IST)
  const cronSchedule = "0 6,18 * * *";

  cron.schedule(cronSchedule, async () => {
    console.log("[Scheduler] Running automated weather alert threshold analysis across agricultural districts...");
    try {
      const res = await WeatherService.runScheduledAlertScan();
      console.log(
        `[Scheduler] Weather scan complete: ${res.alertsTriggered} alerts triggered across ${res.districtsChecked} districts (${res.expiredDeactivated} expired deactivated).`
      );
    } catch (err: any) {
      console.error("[Scheduler] Weather alert scan cron error:", err.message);
    }
  });

  console.log(`[Scheduler] Scheduled Weather alert scan cron registered ('${cronSchedule}')`);
}

async function start(): Promise<void> {
  await connectDB();
  await ensureStorageSeedData();
  await marketService.seedMarketsIfEmpty();
  setupMandiCronJob();
  setupWeatherCronJob();

  // Run an initial non-blocking weather alert scan on startup
  WeatherService.runScheduledAlertScan().catch((err) =>
    console.warn("[WeatherService] Initial startup scan non-critical error:", err.message)
  );

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
