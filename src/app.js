import 'dotenv/config';
import express from 'express';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { REST, Routes } from 'discord.js';
import { getRandomEmoji } from './utils.js';


// Create an express app
const app = express();
app.use(express.json());
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games

const discord = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  console.log(req.body)

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {

    const { name } = data;

    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `hello world ${getRandomEmoji()}`
            }
          ]
        },
      });
    }

    if (name === 'steal') {
      // Send a message into the channel where command was triggered from

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

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
