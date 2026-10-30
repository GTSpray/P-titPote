import {
  remind,
  type remindCommandData,
} from '../../../../../src/commands/slash/remind/index.js';
import {
  ApplicationIntegrationType,
  ChannelType,
  ComponentType,
  InteractionContextType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { interactionBodyChannel } from '../../../../mocks/interactionBodyChannel.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import type { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import { initORM } from '../../../../initORM.js';
import { t } from '../../../../../src/i18n/index.js';

describe('/remind', () => {
  const data: remindCommandData = {
    id: randomDiscordId19(),
    name: 'remind',
    options: [],
    type: 1,
  };

  it('should declare a slash command without subcommands', () => {
    const declaration = remind.builder.setName('remind');
    const json = declaration.toJSON();

    expect(json).toMatchObject({
      description: t('remind.description'),
      contexts: [InteractionContextType.Guild],
      integration_types: [ApplicationIntegrationType.GuildInstall],
      default_member_permissions: `${Number(PermissionFlagsBits.SendMessages)}`,
    });
    expect(json.options ?? []).toEqual([]);
  });

  it('should respond with ephemeral action menu in a thread', async () => {
    const { req, res } = getInteractionCommandHttpMock({ data });
    interactionBodyChannel(req).type = ChannelType.PublicThread;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindCommandData> = {
      req,
      res,
      dbServices,
    };

    const response = await remind.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.menu.chooseAction'),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'remindMenu' },
                }),
                placeholder: t('remind.menu.placeholder'),
                options: [
                  {
                    label: t('remind.action.on'),
                    value: 'on',
                  },
                  {
                    label: t('remind.action.status'),
                    value: 'status',
                  },
                  {
                    label: t('remind.action.off'),
                    value: 'off',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('should refuse outside a thread', async () => {
    const { req, res } = getInteractionCommandHttpMock({ data });
    interactionBodyChannel(req).type = ChannelType.GuildText;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindCommandData> = {
      req,
      res,
      dbServices,
    };

    const response = await remind.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.on.notThread'),
      },
    });
  });
});
