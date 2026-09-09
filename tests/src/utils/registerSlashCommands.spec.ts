import { REST } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { slashcommandsRegister } from '../../../src/commands/slash/index.js';
import { logger } from '../../../src/logger.js';
import { registerSlashCommands } from '../../../src/utils/registerSlashCommands.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { randomDiscordId19 } from '../../mocks/discord-api/utils.js';

describe('registerSlashCommands', () => {
  const appId = randomDiscordId19();

  beforeEach(() => {
    process.env.APP_ID = appId;
  });

  afterEach(() => {
    delete process.env.APP_ID;
  });

  it('throws when APP_ID is unset', async () => {
    delete process.env.APP_ID;

    await expect(registerSlashCommands()).rejects.toThrow(
      'no APP_ID provided in env',
    );
  });

  it('puts application commands then logs success', async () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.put,
        fullRoute: Routes.applicationCommands(appId),
      },
      [],
    );

    const putSpy = vi.spyOn(REST.prototype, 'put');
    const infoSpy = vi.spyOn(logger, 'info');

    await registerSlashCommands();

    expect(putSpy).toHaveBeenCalledWith(Routes.applicationCommands(appId), {
      body: slashcommandsRegister,
    });
    expect(infoSpy).toHaveBeenCalledWith('register', {
      commands: slashcommandsRegister.map((e) => e.name),
    });
    expect(infoSpy).toHaveBeenCalledWith('success');
    expect(infoSpy).toHaveBeenCalledWith('end process');
  });

  it('logs and swallows Discord errors', async () => {
    const err = new Error('discord unavailable');
    const putSpy = vi.spyOn(REST.prototype, 'put').mockRejectedValue(err);
    putSpy.mockClear();
    const errorSpy = vi.spyOn(logger, 'error');
    const infoSpy = vi.spyOn(logger, 'info');

    await registerSlashCommands();

    expect(putSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith('register error', err);
    expect(infoSpy).toHaveBeenCalledWith('end process');
  });
});
