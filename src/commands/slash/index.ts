import type { SlashCommandDeclaration } from "../commands";
import { stealemoji } from "./stealemoji";
import { version } from "./version";

export const slashcommands: Record<string, SlashCommandDeclaration> = {
  version,
  stealemoji,
};

export const slashcommandsRegister = Object.keys(slashcommands).map((name) => {
  const { builder } = slashcommands[name];
  builder.setName(name);
  return builder.toJSON();
});
