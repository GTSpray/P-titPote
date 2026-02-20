import { APIBaseInteraction, InteractionType } from "discord.js";
import { Request, Response } from "express";
import { DBServices } from "../db/db.js";

type DiscordInteractionBody<Data> = APIBaseInteraction<
  InteractionType.ModalSubmit | InteractionType.MessageComponent,
  Data
>;

export type ModalHandlerOptions<Data> = {
  req: Request<any, any, DiscordInteractionBody<Data>, any, any>;
  res: Response;
  dbServices?: DBServices;
  additionalData: object;
};

export type ModalHandlerDelcaration<Data extends object> = {
  handler: (opts: ModalHandlerOptions<Data>) => Promise<Response>;
};
