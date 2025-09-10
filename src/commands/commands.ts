import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { Request, Response } from "express";

export type CommandHandlerOptions = {
  req: Request;
  res: Response;
};

export type SlashCommandDeclaration = {
  builder: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  handler: (opts: CommandHandlerOptions) => Promise<Response>;
};
