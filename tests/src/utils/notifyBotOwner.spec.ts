import { REST } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../../../src/logger.js';
import { notifyBotOwner } from '../../../src/utils/notifyBotOwner.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { randomDiscordId19 } from '../../mocks/discord-api/utils.js';

describe('notifyBotOwner', () => {
  const ownerId = randomDiscordId19();
  const channelId = randomDiscordId19();
  const content = 'hello owner';

  beforeEach(() => {
    process.env.BOT_OWNER_ID = ownerId;
  });

  afterEach(() => {
    delete process.env.BOT_OWNER_ID;
  });

  it('skips when BOT_OWNER_ID is unset', async () => {
    delete process.env.BOT_OWNER_ID;
    const postSpy = vi.spyOn(REST.prototype, 'post');
    const debugSpy = vi.spyOn(logger, 'debug');

    await notifyBotOwner(content);

    expect(postSpy).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith('notifyBotOwner skipped', {
      reason: 'no BOT_OWNER_ID',
    });
  });

  it('opens a DM channel then sends the message', async () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.post,
        fullRoute: Routes.userChannels(),
      },
      { id: channelId },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.post,
        fullRoute: Routes.channelMessages(channelId),
      },
      { id: randomDiscordId19() },
    );

    const postSpy = vi.spyOn(REST.prototype, 'post');

    await notifyBotOwner(content);

    expect(postSpy).toHaveBeenCalledWith(Routes.userChannels(), {
      body: { recipient_id: ownerId },
    });
    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(channelId), {
      body: { content },
    });
  });

  it('logs and swallows Discord errors', async () => {
    const err = new Error('dm closed');
    const postSpy = vi.spyOn(REST.prototype, 'post').mockRejectedValue(err);
    postSpy.mockClear();
    const errorSpy = vi.spyOn(logger, 'error');

    await notifyBotOwner(content);

    expect(postSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith('notifyBotOwner failed', { err });
  });
});
