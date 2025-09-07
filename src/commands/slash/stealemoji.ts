import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { Routes } from "discord.js";
import { RESTGetAPIChannelMessagesResult } from "discord-api-types/v10";

import {
  Contexts,
  IntegrationTypes,
  type SlashCommandDeclaration,
} from "../commands";
import { logger } from "../../logger";
import { discordapi } from "../../utils/discordapi";
import { getEmojiUrl } from "../../utils/getEmojiUrl";
import { ExtractedEmoji, extractEmoji } from "../../utils/extractEmoji";

export const stealemoji_emojiLimit = 3;
export const stealemoji_msgLimit = 10;
export const stealemoji_msgSizeLimit = 500;

const emojiLimitPrefetch = 50;

export const stealemoji: SlashCommandDeclaration = {
  description: `Récupère les ${stealemoji_emojiLimit} dernières emotes dans les ${stealemoji_msgLimit} derniers messages de ce chan`,
  contexts: [Contexts.GUILD, Contexts.BOT_DM, Contexts.PRIVATE_CHANNEL],
  integration_types: [
    IntegrationTypes.GUILD_INSTALL,
    IntegrationTypes.USER_INSTALL,
  ],
  handler: async function (req, res) {
    const { channel } = req.body;
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
  },
};
