import { ApplicationCommandType } from "discord.js";
import type {
  APIApplicationCommandRegister,
  SlashCommandDeclaration,
} from "../commands";
import { stealemoji } from "./stealemoji";
import { version } from "./version";

export const slashcommands: Record<string, SlashCommandDeclaration> = {
  version,
  stealemoji,
};

export const slashcommandsRegister: APIApplicationCommandRegister[] =
  Object.keys(slashcommands).map((name) => {
    const slashcommand = slashcommands[name];
    const { handler, ...rest } = slashcommand;
    return {
      ...rest,
      type: ApplicationCommandType.ChatInput,
      name,
    };
  });
