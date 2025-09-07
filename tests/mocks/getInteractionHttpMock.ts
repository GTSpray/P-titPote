import {
    createRequest, createResponse
} from 'node-mocks-http';
import { randomDiscordId19, randomDiscordId16, getRandomString, randomDiscordId18 } from './discord-api/utils';




type BasicInteractionPayload = { guild_id?: string, channel_id?: string,  data?: object };
const getBasicInteractionPayload = ({ data = {}, guild_id = randomDiscordId19(), channel_id = randomDiscordId19()  }: BasicInteractionPayload) => {
    return {
        app_permissions: randomDiscordId16(),
        application_id: randomDiscordId19(),
        attachment_size_limit: 524288000,
        authorizing_integration_owners: {
            0: guild_id
        },
        channel: {
            flags: 0,
            guild_id: guild_id,
            icon_emoji: {
                id: null,
                name: "👋"
            },
            id: channel_id,
            last_message_id: randomDiscordId19(),
            last_pin_timestamp: "2025-09-01T15:36:46.304000+00:00",
            name: "a random channel name",
            nsfw: false,
            parent_id: randomDiscordId19(),
            permissions: randomDiscordId16(),
            position: 0,
            rate_limit_per_user: 0,
            theme_color: null,
            topic: null,
            type: 0
        },
        channel_id, 
        data,
        entitlement_sku_ids: [],
        entitlements: [],
        guild: {
            features: [],
            id: guild_id,
            locale: "en-US"
        },
        guild_id: guild_id,
        guild_locale: "en-US",
        id: randomDiscordId19(),
        locale: "us",
        member: {
            avatar: null,
            banner: null,
            collectibles: null,
            communication_disabled_until: null,
            deaf: false,
            flags: 0,
            joined_at: "2025-08-28T17:23:07.191000+00:00",
            mute: false,
            nick: "GTSpray",
            pending: false,
            permissions: randomDiscordId16(),
            premium_since: null,
            roles: [],
            unusual_dm_activity_until: null,
            user: {
                avatar: getRandomString({ length: 32, number: true, letter: true }),
                avatar_decoration_data: null,
                clan: null,
                collectibles: null,
                discriminator: "0",
                display_name_styles: null,
                global_name: "Spray",
                id: randomDiscordId18(),
                primary_guild: null,
                public_flags: 0,
                username: "gtspray"
            }
        },
        token: getRandomString({ length: 214, number: true, letter: true, uppercase: true }),
        type: 2,
        version: 1
    }
}



type InteractionHttpMockOptions = { data: object };
export const getInteractionHttpMock = (opts: InteractionHttpMockOptions) => {
    return {
        res: createResponse(),
        req: createRequest({
            method: "POST",
            url: "/interactions",
            body: getBasicInteractionPayload(opts)
        }),
    }
}