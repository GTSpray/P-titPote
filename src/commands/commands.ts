import { MikroORM } from "@mikro-orm/core";
import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { Request, Response } from "express";

export type CommandHandlerOptions = {
  req: Request;
  res: Response;
  orm: MikroORM;
};

export type SlashCommandDeclaration = {
  builder:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  handler: (opts: CommandHandlerOptions) => Promise<Response>;
};
