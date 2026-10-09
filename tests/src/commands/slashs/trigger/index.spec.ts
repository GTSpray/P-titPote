import {
  trigger,
  triggerCommandData,
} from '../../../../../src/commands/slash/trigger/index.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import { initORM } from '../../../../initORM.js';
import { t } from '../../../../../src/i18n/index.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../../mocks/discord-api/rolePermission.js';

describe('/trigger', () => {
  let handlerOpts: CommandHandlerOptions<triggerCommandData>;

  const data: triggerCommandData = {
    id: randomDiscordId19(),
    name: 'trigger',
    options: [],
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

  it('should respond with ephemeral action menu', async () => {
    const response = await trigger.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.menu.chooseAction'),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'triggerMenu' },
                }),
                placeholder: t('trigger.menu.placeholder'),
                options: [
                  {
                    label: t('trigger.action.create'),
                    value: 'create',
                  },
                  {
                    label: t('trigger.action.update'),
                    value: 'update',
                  },
                  {
                    label: t('trigger.action.enable'),
                    value: 'enable',
                  },
                  {
                    label: t('trigger.action.disable'),
                    value: 'disable',
                  },
                  {
                    label: t('trigger.action.delete'),
                    value: 'delete',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('should refuse non-moderators', async () => {
    const { req, res } = getInteractionCommandHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await trigger.handler({
      ...handlerOpts,
      req,
      res,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notAllowed'),
      },
    });
  });
});
