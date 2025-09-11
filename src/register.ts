import "dotenv/config";
import { Routes } from "discord.js";
import { discordapi } from "./utils/discordapi.js";
import { slashcommandsRegister } from "./commands/slash/index.js";
import { logger } from "./logger.js";

if (!process.env.APP_ID) {
  throw Error("no APP_ID provided in env");
}

logger.debug("register", { payload: slashcommandsRegister });

logger.info("register", { commands: slashcommandsRegister.map((e) => e.name) });

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
