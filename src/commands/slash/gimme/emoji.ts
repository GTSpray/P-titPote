import { CommandHandlerOptions } from "../../commands.js";
import { Response } from "express";
import { logger } from "../../../logger.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { Routes, SlashCommandBuilder } from "discord.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  RESTGetAPIChannelMessagesResult,
} from "discord-api-types/v10";

import { discordapi } from "../../../utils/discordapi.js";
import { getEmojiUrl } from "../../../utils/getEmojiUrl.js";
import { ExtractedEmoji, extractEmoji } from "../../../utils/extractEmoji.js";

export const stealemoji_emojiLimit = 3;
export const stealemoji_msgLimit = 10;
export const stealemoji_msgSizeLimit = 500;

const emojiLimitPrefetch = 50;

const builder = new SlashCommandBuilder()
  .setDescription("Affiche une image de loutre")
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
  .setContexts(
    InteractionContextType.BotDM,
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  )
  .setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  );

export interface gimmeEmojiCommandData {
  id: string;
  name: string;
  options: [gimmeEmojiSubCommandData];
  type: number;
}

export type gimmeEmojiSubCommandData = {
  name: "emoji";
  type: number;
};

export const emoji = async ({
  req,
  res,
}: CommandHandlerOptions<gimmeEmojiCommandData>): Promise<Response | null> => {
  const { channel } = req.body;
  if (!channel) {
    return res.status(500).json({ error: "invalid" });
  }

  const reqId = req.requestId;
  const channelMessages = (await discordapi.get(
    Routes.channelMessages(channel.id),
    {
      query: new URLSearchParams({
        limit: `${stealemoji_msgLimit}`,
      }),
    },
  )) as RESTGetAPIChannelMessagesResult;

  logger.verbose("channel messages", {
    reqId,
    channelId: channel.id,
    nbMessages: channelMessages.length,
  });

  logger.debug("channelMessages", {
    url: Routes.channelMessages(channel.id),
    channelMessages,
  });

  const emoteIds: Map<string, ExtractedEmoji> = new Map();
  const extractedEmotes = channelMessages
    .filter((m) => m.content.length < stealemoji_msgSizeLimit)
    .reduce((acc: ExtractedEmoji[], msg) => {
      return [...acc, ...extractEmoji(msg.content)];
    }, [])
    .slice(0, emojiLimitPrefetch)
    .filter((e) => {
      if (!emoteIds.has(e.id)) {
        emoteIds.set(e.id, e);
        return true;
      }
      return false;
    })
    .slice(0, stealemoji_emojiLimit);

  logger.verbose("extracted emojies", {
    reqId,
    nbEmotes: extractedEmotes.length,
  });

  let components = [];
  if (extractedEmotes.length === 0) {
    components = [
      {
        type: MessageComponentTypes.TEXT_DISPLAY,
        content: `ahem... j'ai rien trouvé... 🤷`,
      },
    ];
  } else {
    const emojies = await Promise.all(
      extractedEmotes.map(async (e) => {
        const url = await getEmojiUrl(e.id);
        return {
          ...e,
          url,
        };
      }),
    );

    logger.debug("extracted emojies", { reqId, emojies });

    components = [
      {
        type: MessageComponentTypes.TEXT_DISPLAY,
        content: "Voilà.. ce que j'ai trouvé",
      },
      {
        type: MessageComponentTypes.MEDIA_GALLERY,
        items: emojies.map(({ url, name }) => ({
          description: name,
          media: { url },
        })),
      },
    ];
  }

  return res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      components,
    },
  });
};
