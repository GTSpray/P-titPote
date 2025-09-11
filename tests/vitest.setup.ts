import { DiscrodRESTMock } from "./mocks/discordjs.js";
import { vi } from "vitest";
import "./customMatchers/customMatchers.js";

vi.mock("../src/logger", () => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    http: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
  },
}));

vi.mock(import("discord.js"), async (importOriginal) => {
  const mod = await importOriginal(); // type is inferred
  return {
    ...mod,
    REST: DiscrodRESTMock,
  };
});
