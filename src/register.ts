import "dotenv/config";
import { Routes } from "discord.js";
import { discordapi } from "./utils/discordapi";
import { slashcommandsRegister } from "./commands/slash";
import { logger } from "./logger";

if (!process.env.APP_ID) {
  throw Error("no APP_ID provided in env");
}

logger.info("register", { payload: slashcommandsRegister });

(async () => {
  try {
    await discordapi.put(Routes.applicationCommands(process.env.APP_ID), {
      body: slashcommandsRegister,
    });
    logger.info("success");
  } catch (err) {
    logger.error("register error", err);
  } finally {
    logger.info("end process");
  }
})();
