import {
  APIApplicationCommand,
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord.js";
import { Request, Response } from "express";

type CommandHandler = (req: Request, res: Response) => Promise<Response>;

export type APIApplicationCommandRegister = Omit<
  APIApplicationCommand,
  | "handler"
  | "id"
  | "type"
  | "application_id"
  | "default_member_permissions"
  | "version"
>;

export type SlashCommandDeclaration = Omit<
  APIApplicationCommandRegister,
  "name"
> & {
  contexts: InteractionContextType[];
  integration_types: ApplicationIntegrationType[];
  handler: CommandHandler;
};
