import "dotenv/config";
import {
  Options,
  MariaDbDriver,
  DefaultLogger,
  LogContext,
  LoggerNamespace,
  defineConfig,
} from "@mikro-orm/mariadb";
import { Migrator } from "@mikro-orm/migrations";
import { logger } from "./logger.js";
import { DiscordGuild } from "./db/entities/DiscordGuild.entity.js";
import { MessageAliased } from "./db/entities/MessageAliased.entity.js";

class CustomLogger extends DefaultLogger {
  logQuery(context: { query: string } & LogContext): void {
    logger.info("new sql query", {
      context,
    });
  }
  log(namespace: LoggerNamespace, message: string, context?: LogContext) {
    switch (context?.level) {
      case "error":
        logger.error(message, { context });
        break;
      case "info":
        logger.info(message, { context });
        break;
      case "warning":
        logger.warn(message, { context });
        break;
      default:
        logger.debug(message, { namespace, context });
        break;
    }
  }
}

const config: Options = defineConfig({
  driver: MariaDbDriver,
  dbName: process.env.MARIADB_DATABASE,
  host: process.env.DB_HOST,
  user: process.env.MARIADB_USER,
  password: process.env.MARIADB_PASSWORD,
  port: parseInt(process.env.MARIADB_TCP_PORT ?? "0", 10),
  entities: [DiscordGuild, MessageAliased],
  debug: true,
  loggerFactory: (options) => new CustomLogger(options),
  dynamicImportProvider: (id) => import(id),
  extensions: [Migrator],
  migrations: {
    path: "dist/src/migrations",
    transactional: false,
  },
});

export default config;
