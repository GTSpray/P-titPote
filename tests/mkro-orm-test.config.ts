import { DefaultLogger, Options } from "@mikro-orm/mariadb";
import config from "../src/mikro-orm.config.js";

class ShutUpLogger extends DefaultLogger {
  log() {}
}

const c: Options = {
  ...config,
  dbName: "ptitpotetest",
  host: "dbtest",
  user: "ptitpotetest",
  password: "ptitpotetestpassword",
  port: 3306,
  debug: false,
  loggerFactory: (options) => new ShutUpLogger(options),
};

export default c;
