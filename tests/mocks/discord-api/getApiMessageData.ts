import { APIMessage, MessageType } from "discord.js";
import { BitFieldFlag, getRandomString, randomDiscordId19 } from "./utils.js";
import { getApiUserData } from "./getApiUserData.js";

export const getApiMessageData = (
  options: Partial<APIMessage> = {},
): APIMessage => {
  return {
    type: MessageType.Default,
    content: `this is random string : ${getRandomString({ letter: true, uppercase: true })}`,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    timestamp: "2025-09-01T15:35:01.588000+00:00",
    edited_timestamp: null,
    flags: <BitFieldFlag>0,
    components: [],
    id: randomDiscordId19(),
    channel_id: randomDiscordId19(),
    author: getApiUserData(),
    pinned: false,
    mention_everyone: false,
    tts: false,
    ...options,
  };
};
