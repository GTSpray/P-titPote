import {
  remind,
  type remindDataOpts,
} from '../../../../../src/commands/slash/remind/index.js';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import * as onModule from '../../../../../src/commands/slash/remind/on.js';
import * as statusModule from '../../../../../src/commands/slash/remind/status.js';
import * as offModule from '../../../../../src/commands/slash/remind/off.js';
import { initORM } from '../../../../initORM.js';
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { t } from '../../../../../src/i18n/index.js';
import {
  REMIND_DAYS_MAX,
  REMIND_DAYS_MIN,
} from '../../../../../src/utils/remindConstants.js';

describe('/remind', () => {
  let handlerOpts: CommandHandlerOptions<remindDataOpts>;

  it('should declare a slash command', () => {
    const declaration = remind.builder.setName('remind');
    expect(declaration.toJSON()).toMatchObject({
      description: t('remind.description'),
      contexts: [InteractionContextType.Guild],
      integration_types: [ApplicationIntegrationType.GuildInstall],
      default_member_permissions: `${Number(PermissionFlagsBits.SendMessages)}`,
      options: expect.any(Array),
    });
  });

  describe('on subcommand', () => {
    const subcommand: onModule.remindOnSubCommandData = {
      name: 'on',
      options: [{ name: 'days', type: 4, value: 2 }],
      type: 1,
    };
    const data: onModule.remindOnCommandData = {
      id: randomDiscordId19(),
      name: 'remind',
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = { req, res, dbServices };
    });

    it('should be declared as subcommand with days option', () => {
      const declaration = remind.builder.setName('remind');
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            name: 'on',
            description: t('remind.sub.on.description'),
            options: expect.arrayContaining([
              expect.objectContaining({
                name: 'days',
                required: true,
                min_value: REMIND_DAYS_MIN,
                max_value: REMIND_DAYS_MAX,
              }),
            ]),
          }),
        ]),
      });
    });

    it('should call "on" handler', async () => {
      using spy = vi.spyOn(onModule, 'on').mockResolvedValue(handlerOpts.res);
      const fakeOpts = {
        ...handlerOpts,
        dbServices: 'fakeDbServices',
      } as unknown as typeof handlerOpts;

      await remind.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts, subcommand);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('status subcommand', () => {
    const subcommand: statusModule.remindStatusSubCommandData = {
      name: 'status',
      options: [],
      type: 1,
    };
    const data: statusModule.remindStatusCommandData = {
      id: randomDiscordId19(),
      name: 'remind',
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = { req, res, dbServices };
    });

    it('should call "status" handler', async () => {
      using spy = vi
        .spyOn(statusModule, 'status')
        .mockResolvedValue(handlerOpts.res);
      const fakeOpts = {
        ...handlerOpts,
        dbServices: 'fakeDbServices',
      } as unknown as typeof handlerOpts;

      await remind.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('off subcommand', () => {
    const subcommand: offModule.remindOffSubCommandData = {
      name: 'off',
      options: [],
      type: 1,
    };
    const data: offModule.remindOffCommandData = {
      id: randomDiscordId19(),
      name: 'remind',
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = { req, res, dbServices };
    });

    it('should call "off" handler', async () => {
      using spy = vi.spyOn(offModule, 'off').mockResolvedValue(handlerOpts.res);
      const fakeOpts = {
        ...handlerOpts,
        dbServices: 'fakeDbServices',
      } as unknown as typeof handlerOpts;

      await remind.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('on invalid subcommand', () => {
    const data = {
      id: randomDiscordId19(),
      name: 'remind',
      options: [{ name: 'nope', type: 1 }],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = { req, res, dbServices };
    });

    it('should return invalid subcommand error', async () => {
      const response = await remind.handler(handlerOpts);
      expect(response).toMeetApiResponse(400, {
        error: t('errors.invalidSubcommand'),
        context: { subcommandName: 'nope' },
      });
    });
  });

  describe('on invalid command payload', () => {
    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({
        data: { id: randomDiscordId19(), name: 'remind', type: 1 } as any,
      });
      const dbServices = await initORM();
      handlerOpts = { req, res, dbServices };
    });

    it('should return invalid command payload error', async () => {
      const response = await remind.handler(handlerOpts);
      expect(response?.statusCode).toBe(400);
    });
  });
});
