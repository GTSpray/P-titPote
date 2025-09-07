import "dotenv/config";

import { REST } from "discord.js";

if (!process.env.BOT_TOKEN) {
  throw Error("no APP_ID provided in env");
}
export const discordapi = new REST({ version: "10" }).setToken(
  process.env.BOT_TOKEN,
);
