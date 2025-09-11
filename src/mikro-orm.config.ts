import "dotenv/config";
import {
  Options,
  MySqlDriver,
  DefaultLogger,
  LogContext,
  LoggerNamespace,
} from "@mikro-orm/mysql";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import { logger } from "./logger.js";

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

const config: Options = {
  driver: MySqlDriver,
  dbName: process.env.MYSQL_DATABASE,
  host: process.env.DB_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  port: parseInt(process.env.MYSQL_TCP_PORT ?? "0", 10),
  entities: ["dist/src/db/entities/*.entity.js"],
  entitiesTs: ["src/db/entities/*.entity.ts"],
  // we will use the ts-morph reflection, an alternative to the default reflect-metadata provider
  // check the documentation for their differences: https://mikro-orm.io/docs/metadata-providers
  metadataProvider: TsMorphMetadataProvider,
  debug: true,
  loggerFactory: (options) => new CustomLogger(options),
};

export default config;
