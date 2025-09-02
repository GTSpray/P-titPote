import {
    InteractionResponseFlags,
    InteractionResponseType,
    MessageComponentTypes,
} from 'discord-interactions';
import { getRandomEmoji } from '../../utils.js';

export const version = {
    description: 'Affiche la version de P\'titPote Bot',
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    handler: async function (req, res) {
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                components: [
                    {
                        type: MessageComponentTypes.TEXT_DISPLAY,
                        content: `Hello here ${getRandomEmoji()}! \nJe suis P'titPote v${process.env.npm_package_version}.`
                    }
                ]
            },
        });
    }
};