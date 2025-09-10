import {
  APIBaseInteraction,
  InteractionType,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { Request, Response } from "express";
import { DBServices } from "../db/db.js";

type DiscordInteractionBody<Data> = APIBaseInteraction<
  InteractionType.ApplicationCommand,
  Data
>;

export type CommandHandlerOptions<Data> = {
  req: Request<any, any, DiscordInteractionBody<Data>, any, any>;
  res: Response;
  dbServices?: DBServices;
};

export type SlashCommandDeclaration<Data extends object> = {
  builder:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  handler: (opts: CommandHandlerOptions<Data>) => Promise<Response>;
};

export interface SubCommandOption<n, v> {
  name: n;
  type: number;
  value: v;
}
