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

export interface CTAData {
  components: Component<CTAComponnent>[];
  custom_id: string;
}

type CTAComponnent = ComponentSimple | ComponentSelect;
interface Component<T extends CTAComponnent> {
  component: T;
  id: number;
  type: number;
}

export interface ComponentSimple {
  custom_id: string;
  id: number;
  type: number;
  value: string | number;
}

export interface ComponentSelect {
  custom_id: string;
  id: number;
  type: number;
  values: string[];
}


type getInputComponnentByIdDeclaration<T extends CTAComponnent> =
  | Component<T>
  | undefined;
export function getInputComponnentById<T extends CTAComponnent>(
  data: CTAData | undefined,
  componentId: string,
): getInputComponnentByIdDeclaration<T> {
  const cmp: unknown = data?.components.find(
    (e: any) => `${e.component?.custom_id}` === componentId,
  );

  if (cmp) {
    return <getInputComponnentByIdDeclaration<T>>cmp;
  }
  return undefined;
}

type getInputComponnentsByPrefixDeclaration<T extends CTAComponnent> =
  Component<T>[];
export function getInputComponnentsByPrefix<T extends CTAComponnent>(
  data: CTAData | undefined,
  componentId: string,
): getInputComponnentsByPrefixDeclaration<T> {
  return data?.components.filter((e: any) =>
    `${e.component?.custom_id}`.startsWith(componentId),
  ) as getInputComponnentsByPrefixDeclaration<T>;
}