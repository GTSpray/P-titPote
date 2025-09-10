import { initORM } from "../src/db/db.js";
import config from "./mkro-orm-test.config.js";

export default async function setup() {
  process.env.LOG_LEVEL = "";
  const { orm } = await initORM(config);
  const generator = orm.schema;
  await generator.dropSchema();
  await generator.createSchema();
  await orm.close(true);
}
