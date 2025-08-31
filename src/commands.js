import 'dotenv/config';

import { REST, Routes } from 'discord.js';
import { getRandomEmoji } from './utils.js';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from 'discord-interactions';

const discord = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
export const commands = ({
  test: {
    description: 'Basic command',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    handler: async function (req, res) {
      console.log(req.body);
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `hello world ${getRandomEmoji()}!`
            }
          ]
        },
      });
    }
  },
  stealemoji: {
    description: 'Récupère les 3 dernières emotes dans les 10 derniers messages de ce chan',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    handler: async function (req, res) {
      const { channel } = req.body;
      const channelMessages = await discord.get(Routes.channelMessages(channel.id), {
        query: new URLSearchParams({
          limit: 10
        })
      });

      const regex = /<a?\:([a-z _ 0-9]+)\:([0-9]{18,20})>/gmi;
      const extractedEmotes = channelMessages
        .filter(m => m.content.length < 500)
        //.filter( m => m.content.match(regex))
        .reduce((acc, msg) => {
          let m;
          while ((m = regex.exec(msg.content)) !== null) {
            if (m.index === regex.lastIndex) {
              regex.lastIndex++;
            }
            const [input, name, id] = m;
            acc.push({
              id,
              name,
              input
            });
          }
          return acc
        }, [])
        .slice(0, 3)

      if(extractedEmotes.length === 0) {
         return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: `ahem... j'ai rien trouvé... 🤷`
              }
            ]
          },
        });
      }

      const emojies = await Promise.all(extractedEmotes.map(async (e) => {
        const response = await fetch(`https://cdn.discordapp.com/emojis/${e.id}.gif`);
        return {
          ...e,
          url: `https://cdn.discordapp.com/emojis/${e.id}.${response.ok ? 'gif' : 'png'}`
        }
      }));

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
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
        },
      });
    }
  },
})
