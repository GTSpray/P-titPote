import { Request, Response } from "express";

type CommandHandler = (req: Request, res: Response) => Promise<Response>;

export type SlashCommandDeclaration = {
    description: string;
    integration_types: number[];
    contexts: number[];
    handler: CommandHandler;
}

export enum Contexts {
  GUILD = 0,
  BOT_DM = 1,
  PRIVATE_CHANNEL = 2,
}

export enum IntegrationTypes {
  GUILD_INSTALL = 0,
  USER_INSTALL = 1,
}

