import {
  alias,
  type aliasDataOpts,
} from '../../../../../src/commands/slash/alias/index.js';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import * as setModule from '../../../../../src/commands/slash/alias/set.js';
import * as sayModule from '../../../../../src/commands/slash/alias/say.js';
import * as rmModule from '../../../../../src/commands/slash/alias/rm.js';
import * as lsModule from '../../../../../src/commands/slash/alias/ls.js';
import { DBServices } from '../../../../../src/db/db.js';
import { initORM } from '../../../../initORM.js';
import { type aliasSetSubCommandData } from '../../../../../src/commands/slash/alias/set.js';
import { type aliasSaySubCommandData } from '../../../../../src/commands/slash/alias/say.js';
import { type aliasRmSubCommandData } from '../../../../../src/commands/slash/alias/rm.js';
import { type aliasLsSubCommandData } from '../../../../../src/commands/slash/alias/ls.js';
import {
  ApplicationIntegrationType,
  InteractionContextType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../../src/i18n/index.js';

describe('/alias', () => {
  let handlerOpts: CommandHandlerOptions<aliasDataOpts>;
  it('should declare a slash command', () => {
    const declaration = alias.builder.setName('alias');
    expect(declaration.toJSON()).toMatchObject({
      description: t('alias.description'),
      contexts: [
        InteractionContextType.BotDM,
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel,
      ],
      integration_types: [
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall,
      ],
      default_member_permissions: `${Number(PermissionFlagsBits.SendMessages)}`,

      options: expect.any(Array),
    });
  });

  describe('set subcommand', () => {
    const subcommand: aliasSetSubCommandData = {
      name: 'set',
      options: [],
      type: 1,
    };
    const data: setModule.aliasSetCommandData = {
      id: randomDiscordId19(),
      name: 'alias',
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({
        data,
        permissions: admin_permissions,
      });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    it('should be declared as subcommand', () => {
      const declaration = alias.builder.setName(subcommand.name);
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            name: subcommand.name,
            description: t('alias.sub.set.description'),
            options: [],
          }),
        ]),
      });
    });

    it('should display a temporary message indicating that the command cannot be executed if the user is not a moderator', async () => {
      using spy = vi.spyOn(setModule, 'set').mockResolvedValue(handlerOpts.res);

      const { req, res } = getInteractionCommandHttpMock({
        data,
        permissions: default_member_permissions,
      });

      const fakeOpts = {
        ...handlerOpts,
        req,
        res,
        dbServices: 'fakeDbServices', // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      const response = await alias.handler(fakeOpts);

      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.Ephemeral,
          content: t('common.notAllowed'),
        },
      });
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should call "set" handler', async () => {
      using spy = vi.spyOn(setModule, 'set').mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: 'fakeDbServices', // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await alias.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts, subcommand);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "set" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(setModule, 'set').mockResolvedValue(fakeResp);

      const response = await alias.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });

  describe('say subcommand', () => {
    const subcommand: aliasSaySubCommandData = {
      name: 'say',
      options: [],
      type: 1,
    };
    const data: sayModule.aliasSayCommandData = {
      id: randomDiscordId19(),
      name: 'alias',
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({
        data,
        permissions: admin_permissions,
      });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    it('should be declared as subcommand', () => {
      const declaration = alias.builder.setName(subcommand.name);
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            name: subcommand.name,
            description: t('alias.sub.say.description'),
            options: [],
          }),
        ]),
      });
    });

    it('should display a temporary message indicating that the command cannot be executed if the user is not a moderator', async () => {
      using spy = vi.spyOn(sayModule, 'say').mockResolvedValue(handlerOpts.res);

      const { req, res } = getInteractionCommandHttpMock({
        data,
        permissions: default_member_permissions,
      });

      const fakeOpts = {
        ...handlerOpts,
        req,
        res,
        dbServices: 'fakeDbServices', // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      const response = await alias.handler(fakeOpts);

      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.Ephemeral,
          content: t('common.notAllowed'),
        },
      });
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should call "say" handler', async () => {
      using spy = vi.spyOn(sayModule, 'say').mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: 'fakeDbServices', // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await alias.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts, subcommand);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "say" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(sayModule, 'say').mockResolvedValue(fakeResp);

      const response = await alias.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });

  describe('rm subcommand', () => {
    const subcommand: aliasRmSubCommandData = {
      name: 'rm',
      options: [],
      type: 1,
    };
    const data: rmModule.aliasRmCommandData = {
      id: randomDiscordId19(),
      name: 'alias',
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({
        data,
        permissions: admin_permissions,
      });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    it('should be declared as subcommand', () => {
      const declaration = alias.builder.setName(subcommand.name);
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            name: subcommand.name,
            description: t('alias.sub.rm.description'),
            options: [],
          }),
        ]),
      });
    });

    it('should display a temporary message indicating that the command cannot be executed if the user is not a moderator', async () => {
      using spy = vi.spyOn(rmModule, 'rm').mockResolvedValue(handlerOpts.res);

      const { req, res } = getInteractionCommandHttpMock({
        data,
        permissions: default_member_permissions,
      });

      const fakeOpts = {
        ...handlerOpts,
        req,
        res,
        dbServices: 'fakeDbServices', // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      const response = await alias.handler(fakeOpts);

      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.Ephemeral,
          content: t('common.notAllowed'),
        },
      });
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should call "rm" handler', async () => {
      using spy = vi.spyOn(rmModule, 'rm').mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: 'fakeDbServices', // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await alias.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts, subcommand);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "rm" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(rmModule, 'rm').mockResolvedValue(fakeResp);

      const response = await alias.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });

  describe('ls subcommand', () => {
    const subcommand: aliasLsSubCommandData = {
      name: 'ls',
      options: [],
      type: 1,
    };
    const data: lsModule.aliasLsCommandData = {
      id: randomDiscordId19(),
      name: 'alias',
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({
        data,
        permissions: admin_permissions,
      });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    it('should be declared as subcommand', () => {
      const declaration = alias.builder.setName(subcommand.name);
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            name: subcommand.name,
            description: t('alias.sub.ls.description'),
            options: [],
          }),
        ]),
      });
    });

    it('should display a temporary message indicating that the command cannot be executed if the user is not a moderator', async () => {
      using spy = vi.spyOn(lsModule, 'ls').mockResolvedValue(handlerOpts.res);

      const { req, res } = getInteractionCommandHttpMock({
        data,
        permissions: default_member_permissions,
      });

      const fakeOpts = {
        ...handlerOpts,
        req,
        res,
        dbServices: 'fakeDbServices', // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      const response = await alias.handler(fakeOpts);

      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.Ephemeral,
          content: t('common.notAllowed'),
        },
      });
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should call "ls" handler', async () => {
      using spy = vi.spyOn(lsModule, 'ls').mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: 'fakeDbServices', // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await alias.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "ls" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(lsModule, 'ls').mockResolvedValue(fakeResp);

      const response = await alias.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });

  describe('on invalid subcommand option', () => {
    const data = {
      id: randomDiscordId19(),
      name: 'alias',
      options: [
        {
          name: 'unexistingsubcommand',
        },
      ],
      type: 1,
    } as unknown as setModule.aliasSetCommandData;

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({
        data,
        permissions: admin_permissions,
      });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    it('should return invalid subcommand result', async () => {
      const response = await alias.handler(handlerOpts);

      expect(response).toMeetApiResponse(400, {
        error: t('errors.invalidSubcommand'),
        context: {
          subcommandName: data.options[0].name,
        },
      });
    });
  });

  describe('on invalid command option', () => {
    let dbServices: DBServices;
    alias;
    const validdata = {
      id: randomDiscordId19(),
      name: 'alias',
      options: [
        {
          name: 'validsubcommandname',
        },
      ],
      type: 1,
    } as unknown as aliasDataOpts;

    beforeEach(async () => {
      dbServices = await initORM();
    });

    it.each([
      [
        'invalid_type',
        {
          code: 'invalid_type',
          expected: 'array',
          message: 'Invalid input: expected array, received undefined',
          path: ['options'],
        },
        {
          ...validdata,
          options: undefined,
        },
      ],
      [
        'too_small',
        {
          code: 'too_small',
          inclusive: true,
          message: 'Too small: expected array to have >=1 items',
          minimum: 1,
          origin: 'array',
          path: ['options'],
        },
        {
          ...validdata,
          options: [],
        },
      ],
    ])(
      'should return invalid command result when %s options',
      async (_code, issue, data) => {
        const { req, res } = getInteractionCommandHttpMock({
          data,
          permissions: admin_permissions,
        });

        let handlerOpts: any = { req, res, dbServices };

        const response = await alias.handler(handlerOpts);

        expect(response).toMeetApiResponse(400, {
          error: t('errors.invalidCommandPayload'),
          issues: [issue],
        });
      },
    );

    it.each([
      [
        'invalid_type',
        {
          code: 'invalid_type',
          expected: 'string',
          message: 'Invalid input: expected string, received undefined',
          path: ['name'],
        },
        {
          ...validdata,
          name: undefined,
        },
      ],
    ])(
      'should return invalid command result when %s name',
      async (_code, issue, data) => {
        const { req, res } = getInteractionCommandHttpMock({
          data,
          permissions: admin_permissions,
        });

        let handlerOpts: any = { req, res, dbServices };

        const response = await alias.handler(handlerOpts);

        expect(response).toMeetApiResponse(400, {
          error: t('errors.invalidCommandPayload'),
          issues: [issue],
        });
      },
    );
  });
});
