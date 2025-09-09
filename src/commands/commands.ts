import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { Request, Response } from "express";

type CommandHandler = (req: Request, res: Response) => Promise<Response>;

export type SlashCommandDeclaration = {
  builder: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  handler: CommandHandler;
};
