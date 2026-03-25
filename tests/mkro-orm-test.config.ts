import { defineConfig, DefaultLogger, MariaDbDriver } from "@mikro-orm/mariadb";
import { DiscordGuild } from "../src/db/entities/DiscordGuild.entity.js";
import { MessageAliased } from "../src/db/entities/MessageAliased.entity.js";

class ShutUpLogger extends DefaultLogger {
  log() {}
}

export default defineConfig({
  driver: MariaDbDriver,
  dbName: "ptitpotetest",
  host: "dbtest",
  user: "ptitpotetest",
  password: "ptitpotetestpassword",
  port: 3306,
  debug: false,
  loggerFactory: (options) => new ShutUpLogger(options),
  entities: [DiscordGuild, MessageAliased],
});