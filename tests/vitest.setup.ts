import { DiscrodRESTMock } from "./mocks/discordjs.js";
import { vi } from "vitest";
import "./customMatchers/customMatchers.js";
import config from "./mkro-orm-test.config.js";
import { initORM } from "../src/db/db.js";

vi.mock("../src/logger.js");

vi.mock("discord.js", async (importOriginal) => {
  const mod: any = await importOriginal();
  return {
    ...mod,
    REST: DiscrodRESTMock,
  };
});

beforeAll(async () => {
  await initORM(config);
});

afterAll(async () => {
  const { orm } = await initORM();
  await orm.close(true);
});

afterEach(() => {
  DiscrodRESTMock.clear();
});
