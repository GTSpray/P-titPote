import type { APIBaseInteraction } from 'discord-api-types/v10';
import { InteractionType } from 'discord-api-types/v10';
import {
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { Request, Response } from 'express';
import type { DBServices } from '../db/db.js';

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
