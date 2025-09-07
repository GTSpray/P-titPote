import { APIChannel, ChannelType } from "discord.js"
import { BitFieldFlag, getRandomString, randomDiscordId19 } from "./utils"

export const getApiChannelData = (options: Partial<APIChannel> = {}): APIChannel => {
    return {
        flags: <BitFieldFlag>0,
        guild_id: randomDiscordId19(),
        // icon_emoji: {
        //     id: null,
        //     name: "👋"
        // },
        id: randomDiscordId19(),
        last_message_id: randomDiscordId19(),
        last_pin_timestamp: "2025-09-01T15:36:46.304000+00:00",
        name: `a random channel name ${getRandomString({ letter: true, uppercase: true })}`,
        nsfw: false,
        parent_id: randomDiscordId19(),
        //permissions: randomDiscordId16(),
        position: 0,
        rate_limit_per_user: 0,
        // theme_color: null,
        topic: null,
        type: ChannelType.GuildText,
        applied_tags: [],
        ...options
    } as APIChannel
}