import "dotenv/config";

import { REST } from "discord.js";
import { t } from "../i18n/index.js";

if (!process.env.BOT_TOKEN) {
  throw Error(t("startup.noTokenEnv"));
}
export const discordapi = new REST({ version: "10" }).setToken(
  process.env.BOT_TOKEN,
);
