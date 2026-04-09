import config from "./mkro-orm-test.config.js";
import { initORM as initORMTest } from "../src/db/db.js";
export const initORM = () => initORMTest(config);
