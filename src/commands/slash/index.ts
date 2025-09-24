import type { SlashCommandDeclaration } from "../commands.js";
import { stealemoji } from "./stealemoji.js";
import { version } from "./version.js";
import { gimmeotter } from "./gimmeotter.js";
import { alias } from "./alias.js";

export const slashcommands: Record<string, SlashCommandDeclaration<any>> = {
  version,
  stealemoji,
  gimmeotter,
  alias,
};

export const slashcommandsRegister = Object.keys(slashcommands).map((name) => {
  const { builder } = slashcommands[name];
  builder.setName(name);
  return builder.toJSON();
});
