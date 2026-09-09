import { Routes } from 'discord-api-types/v10';

import { slashcommandsRegister } from '../commands/slash/index.js';
import { logger } from '../logger.js';
import { t } from '../i18n/index.js';
import { discordapi } from './discordapi.js';

export async function registerSlashCommands(): Promise<void> {
  if (!process.env.APP_ID) {
    throw Error(t('startup.noTokenEnv'));
  }

  logger.debug('register', { payload: slashcommandsRegister });
  logger.info('register', {
    commands: slashcommandsRegister.map((e) => e.name),
  });

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
}
