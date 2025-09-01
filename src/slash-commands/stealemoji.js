import {
    InteractionResponseFlags,
    InteractionResponseType,
    MessageComponentTypes,
} from 'discord-interactions';
import { Routes } from 'discord.js';
import { discordapi, extractEmoji, getEmojiUrl } from '../utils.js';


const emojiLimit = 3;
const msgLimit = 10;

export const stealemoji = {
    description: `Récupère les ${emojiLimit} dernières emotes dans les ${msgLimit} derniers messages de ce chan`,
    type: 1,
    integration_types: [
        0,
        1
    ],
    contexts: [0, 1, 2],
    handler: async function (req, res) {
        const { channel } = req.body;
        const channelMessages = await discordapi.get(Routes.channelMessages(channel.id), {
            query: new URLSearchParams({
                limit: msgLimit
            })
        });

        const extractedEmotes = channelMessages
            .filter(m => m.content.length < 500)
            .reduce((acc, msg) => {
                return [
                    ...acc,
                    ...extractEmoji(msg.content)
                ]
            }, [])
            .slice(0, emojiLimit)


        let components = []
        if (extractedEmotes.length === 0) {
            components = [
                {
                    type: MessageComponentTypes.TEXT_DISPLAY,
                    content: `ahem... j'ai rien trouvé... 🤷`
                }
            ]
        } else {
            const emojies = await Promise.all(extractedEmotes.map(async (e) => {
                const url = await getEmojiUrl(e.id);
                return {
                    ...e,
                    url
                }
            }));

            components = [
                {
                    type: MessageComponentTypes.TEXT_DISPLAY,
                    content: "Voilà.. ce que j'ai trouvé"
                },
                {
                    "type": MessageComponentTypes.MEDIA_GALLERY,
                    "items": emojies.map(({ url, name }) => ({
                        description: name,
                        media: { url },
                    }))
                }
            ]
        }

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                components
            },
        });
    }
};