import {
    InteractionResponseFlags,
    InteractionResponseType,
    MessageComponentTypes,
} from 'discord-interactions';
import { getRandomEmoji } from '../utils.js';

export const version = {
    description: 'Affiche la verison de P\'titPote Bot',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    handler: async function (req, res) {
        console.dir(req.body, { depth: null, colors: true })
        // Send a message into the channel where command was triggered from
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                components: [
                    {
                        type: MessageComponentTypes.TEXT_DISPLAY,
                        // Fetches a random emoji to send from a helper function
                        content: `Hello here ${getRandomEmoji()}! \nJe suis P'titPote v${process.env.npm_package_version}.`
                    }
                ]
            },
        });
    }
};