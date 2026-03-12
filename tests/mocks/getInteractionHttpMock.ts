import {
  createRequest,
  createResponse,
  MockRequest,
  MockResponse,
} from "node-mocks-http";
import {
  randomDiscordId19,
  randomDiscordId16,
  getRandomString,
} from "./discord-api/utils.js";

import { Request, Response } from "express";

import { APIBaseInteraction, InteractionType, Locale } from "discord.js";
import { getAPIInteractionGuildMemberData } from "./discord-api/getAPIInteractionGuildMemberData.js";
import { getApiUserData } from "./discord-api/getApiUserData.js";
import { getApiChannelData } from "./discord-api/getApiChannelData.js";

type DiscordInteractionBody<
  T extends InteractionType,
  Data,
> = APIBaseInteraction<T, Data>;

type BasicInteractionPayloadOpts<
  T extends InteractionType,
  Data extends object,
> = {
  guild_id?: string;
  channel_id?: string;
  data?: Data;
  type?: T;
};

const getBasicInteractionPayload = <
  T extends InteractionType,
  D extends object,
>({
  data = {} as D,
  guild_id = randomDiscordId19(),
  channel_id = randomDiscordId19(),
  type = InteractionType.ApplicationCommand as T,
}: BasicInteractionPayloadOpts<T, D>): DiscordInteractionBody<T, D> => {
  return {
    app_permissions: randomDiscordId16(),
    application_id: randomDiscordId19(),
    attachment_size_limit: 524288000,
    authorizing_integration_owners: {
      0: guild_id,
    },
    channel: getApiChannelData({
      id: channel_id,
    }),
    channel_id,
    data,
    // entitlement_sku_ids: [],
    entitlements: [],
    guild: {
      features: [],
      id: guild_id,
      locale: Locale.EnglishUS,
    },
    guild_id: guild_id,
    guild_locale: Locale.EnglishUS,
    id: randomDiscordId19(),
    locale: "us" as Locale,
    member: getAPIInteractionGuildMemberData({
      nick: "a random nick",
      user: getApiUserData({
        username: "a random user name",
        global_name: "a random global name",
      }),
    }),
    token: getRandomString({
      length: 214,
      number: true,
      letter: true,
      uppercase: true,
    }),
    type,
    version: 1,
  };
};

type InteractionHttpMockOptions<Data> = { guild_id?: string; data: Data };
export const getInteractionCommandHttpMock = <D extends object>(
  opts: InteractionHttpMockOptions<D>,
): {
  res: MockResponse<Response>;
  req: MockRequest<
    Request<
      any,
      any,
      DiscordInteractionBody<InteractionType.ApplicationCommand, D>,
      any,
      any
    >
  >;
} => ({
  res: createResponse(),
  req: createRequest({
    method: "POST",
    url: "/interactions",
    body: <D>getBasicInteractionPayload({
      ...opts,
      type: InteractionType.ApplicationCommand,
    }),
  }),
});

export const getInteractionModalHttpMock = <D extends object>(
  opts: InteractionHttpMockOptions<D>,
): {
  res: MockResponse<Response>;
  req: MockRequest<
    Request<
      any,
      any,
      DiscordInteractionBody<InteractionType.ModalSubmit, D>,
      any,
      any
    >
  >;
} => ({
  res: createResponse(),
  req: createRequest({
    method: "POST",
    url: "/interactions",
    body: <D>getBasicInteractionPayload({
      ...opts,
      type: InteractionType.ModalSubmit,
    }),
  }),
});
