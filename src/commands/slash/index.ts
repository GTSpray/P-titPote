import type { SlashCommandDeclaration } from "../commands";
import { stealemoji } from "./stealemoji";
import { version } from "./version";
import { gimmeotter } from "./gimmeotter";

export const slashcommands: Record<string, SlashCommandDeclaration> = {
  version,
  stealemoji,
  gimmeotter,
};

export const slashcommandsRegister = Object.keys(slashcommands).map((name) => {
  const { builder } = slashcommands[name];
  builder.setName(name);
  return builder.toJSON();
});
