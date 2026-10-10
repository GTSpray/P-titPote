import { REST } from 'discord.js';
import {
  GatewayDispatchEvents,
  InteractionType,
  Routes,
} from 'discord-api-types/v10';
import { GatewaySocket } from '../../../src/gateway/GatewaySocket.js';
import {
  getInteractionCommand,
  handleGuildCreate,
  handleMessageCreate,
  handleMessageReactionAdd,
  PROBE_COMMAND_NAME,
  PROBE_EMOJI,
  registerGatewayHandlers,
} from '../../../src/gateway/handlers.js';
import { logger } from '../../../src/logger.js';
import { DiscordGuild } from '../../../src/db/entities/DiscordGuild.entity.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { randomDiscordId19 } from '../../mocks/discord-api/utils.js';
import { initORM } from '../../initORM.js';

const appId = '1234567890';
const channelId = randomDiscordId19();
const messageId = randomDiscordId19();
const userId = randomDiscordId19();

const probeMessage = (overrides: object = {}): any => ({
  id: messageId,
  channel_id: channelId,
  interaction_metadata: {
    id: randomDiscordId19(),
    type: InteractionType.ApplicationCommand,
    name: PROBE_COMMAND_NAME,
  },
  ...overrides,
});

const reaction = (overrides: object = {}): any => ({
  channel_id: channelId,
  message_id: messageId,
  message_author_id: appId,
  user_id: userId,
  emoji: { id: null, name: PROBE_EMOJI },
  ...overrides,
});

describe('gateway handlers', () => {
  let putSpy: ReturnType<typeof vi.spyOn>;
  let deleteSpy: ReturnType<typeof vi.spyOn>;
  const ownReactionRoute = Routes.channelMessageOwnReaction(
    channelId,
    messageId,
    PROBE_EMOJI,
  );
  const userReactionRoute = Routes.channelMessageUserReaction(
    channelId,
    messageId,
    PROBE_EMOJI,
    userId,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('APP_ID', appId);
    putSpy = vi.spyOn(REST.prototype, 'put');
    deleteSpy = vi.spyOn(REST.prototype, 'delete');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getInteractionCommand', () => {
    it('reads the name from interaction_metadata', () => {
      expect(getInteractionCommand(probeMessage())).toEqual({
        type: InteractionType.ApplicationCommand,
        name: PROBE_COMMAND_NAME,
      });
    });

    it('falls back to the documented (deprecated) interaction object', () => {
      expect(
        getInteractionCommand({
          interaction: {
            type: InteractionType.ApplicationCommand,
            name: PROBE_COMMAND_NAME,
          },
          interaction_metadata: { type: InteractionType.ApplicationCommand },
        }),
      ).toEqual({
        type: InteractionType.ApplicationCommand,
        name: PROBE_COMMAND_NAME,
      });
    });

    it('returns no name when discord sends none', () => {
      expect(getInteractionCommand({}).name).toBeUndefined();
    });
  });

  describe('handleMessageCreate', () => {
    beforeEach(() => {
      DiscrodRESTMock.register(
        { verb: DiscrodRESTMockVerb.put, fullRoute: ownReactionRoute },
        undefined,
      );
    });

    it('adds the probe reaction on the version reply', async () => {
      await handleMessageCreate(probeMessage());

      expect(putSpy).toHaveBeenCalledExactlyOnceWith(ownReactionRoute);
    });

    it('reads the command name from the deprecated interaction object', async () => {
      await handleMessageCreate(
        probeMessage({
          interaction_metadata: { type: InteractionType.ApplicationCommand },
          interaction: {
            type: InteractionType.ApplicationCommand,
            name: PROBE_COMMAND_NAME,
          },
        }),
      );

      expect(putSpy).toHaveBeenCalledOnce();
    });

    it.each([
      ['another command', { name: 'poll c' }],
      ['a non command interaction', { type: InteractionType.MessageComponent }],
    ])('ignores %s', async (_label, metadata) => {
      await handleMessageCreate(
        probeMessage({
          interaction_metadata: {
            type: InteractionType.ApplicationCommand,
            name: PROBE_COMMAND_NAME,
            ...metadata,
          },
        }),
      );

      expect(putSpy).not.toHaveBeenCalled();
    });

    it('ignores plain messages', async () => {
      await handleMessageCreate(
        probeMessage({ interaction_metadata: undefined }),
      );

      expect(putSpy).not.toHaveBeenCalled();
    });

    it('logs and swallows REST failures', async () => {
      putSpy.mockRejectedValueOnce(new Error('discord down'));

      await expect(
        handleMessageCreate(probeMessage()),
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'gateway message_create handler failed',
        expect.anything(),
      );
    });
  });

  describe('handleMessageReactionAdd', () => {
    beforeEach(() => {
      DiscrodRESTMock.register(
        { verb: DiscrodRESTMockVerb.delete, fullRoute: userReactionRoute },
        undefined,
      );
    });

    it('removes the probe emoji added by a member on a bot message', async () => {
      await handleMessageReactionAdd(reaction());

      expect(deleteSpy).toHaveBeenCalledExactlyOnceWith(userReactionRoute);
    });

    it.each([
      ['a message of another author', { message_author_id: '42' }],
      ['the bot own reaction', { user_id: appId }],
      ['another emoji', { emoji: { id: null, name: '✉️' } }],
    ])('ignores %s', async (_label, overrides) => {
      await handleMessageReactionAdd(reaction(overrides));

      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('logs and swallows REST failures', async () => {
      deleteSpy.mockRejectedValueOnce(new Error('discord down'));

      await expect(
        handleMessageReactionAdd(reaction()),
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'gateway message_reaction_add handler failed',
        expect.anything(),
      );
    });
  });

  describe('handleGuildCreate', () => {
    it('persists the guild', async () => {
      const guildId = randomDiscordId19();

      await handleGuildCreate(initORM(), 0, guildId);

      const { orm } = await initORM();
      expect(
        await orm.em.fork().findOne(DiscordGuild, { guildId }),
      ).not.toBeNull();
    });

    it('logs and swallows database failures', async () => {
      await expect(
        handleGuildCreate(Promise.reject(new Error('db down')), 0, 'guild'),
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'gateway guild_create persist failed',
        expect.objectContaining({ guildId: 'guild' }),
      );
    });
  });

  describe('registerGatewayHandlers', () => {
    it('keeps the other handlers working when a handler fails', async () => {
      const gateway = new GatewaySocket('fakeToken');
      registerGatewayHandlers(gateway, initORM());
      putSpy.mockRejectedValue(new Error('discord down'));

      gateway.emit(GatewayDispatchEvents.MessageCreate, {
        shard: 0,
        event: probeMessage(),
      });
      await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());

      expect(() =>
        gateway.emit(GatewayDispatchEvents.GuildDelete, {
          shard: 0,
          event: { id: 'g', unavailable: undefined },
        }),
      ).not.toThrow();
      expect(logger.info).toHaveBeenCalledWith(
        'gateway guild_delete',
        expect.anything(),
      );
    });
  });
});
