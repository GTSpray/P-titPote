import 'dotenv/config';
import { Routes } from 'discord.js';
import { discordapi } from './utils.js'
import { slashcommands } from './commands/slash/index.js'
import { logger } from './logger.js';


const payload = Object.keys(slashcommands).map((name) => {
  const { handler, ...rest } = slashcommands[name];
  return { name, type: 1, ...rest };
});

logger.info('register', { payload });

discordapi.put(Routes.applicationCommands(process.env.APP_ID), {
  body: payload
})
  .then(() => logger.info('success'))
  .catch((error) => logger.error('register error', error))
  .finally(() => logger.info('end process'))
