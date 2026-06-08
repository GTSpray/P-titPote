import 'dotenv/config';
import { Routes } from 'discord.js';
import { discordapi } from './utils/discordapi.js';
import { slashcommandsRegister } from './commands/slash/index.js';
import { logger } from './logger.js';
import { t } from './i18n/index.js';

if (!process.env.APP_ID) {
  throw Error(t('startup.noTokenEnv'));
}

logger.debug('register', { payload: slashcommandsRegister });

logger.info('register', { commands: slashcommandsRegister.map((e) => e.name) });

(async () => {
  try {
    await discordapi.put(Routes.applicationCommands(process.env.APP_ID), {
      body: slashcommandsRegister,
    });
    logger.info(t('register.success'));
  } catch (err) {
    logger.error('register error', err);
  } finally {
    logger.info(t('register.endProcess'));
  }
})();
