import "dotenv/config";
import { ApplicationCommandType, Routes } from "discord.js";
import { discordapi } from "./utils/discordapi";
import { slashcommands } from "./commands/slash";
import { logger } from "./logger";

if (!process.env.APP_ID) {
  throw Error("no APP_ID provided in env");
}

const payload = Object.keys(slashcommands).map((name) => {
  const slashcommand = slashcommands[name];
  const { handler, ...rest } = slashcommand;
  return { name, type: ApplicationCommandType.ChatInput, ...rest };
});

logger.info("register", { payload });

(async () => {
  try {
    await discordapi.put(Routes.applicationCommands(process.env.APP_ID), {
      body: payload,
    });
    logger.info("success");
  } catch (err) {
    logger.error("register error", err);
  } finally {
    logger.info("end process");
  }
})();
