import {
  triggerSetCommandData,
  triggerSetSubCommandData,
  set,
} from '../../../../../src/commands/slash/trigger/set.js';
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

describe('/trigger set', () => {
  let handlerOpts: CommandHandlerOptions<triggerSetCommandData>;

  const subcommand: triggerSetSubCommandData = {
    name: 'set',
    options: [],
    type: 1,
  };

  const data: triggerSetCommandData = {
    id: randomDiscordId19(),
    name: 'trigger',
    options: [subcommand],
    type: 1,
  };

  beforeEach(async () => {
    const { req, res } = getInteractionCommandHttpMock({ data });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
    };
  });

  it('should respond with ephemeral kind select', async () => {
    const response = await set(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.set.chooseKind'),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'triggerSetType' },
                }),
                placeholder: t('trigger.modal.select.kind.placeholder'),
                options: [
                  {
                    label: t('trigger.kind.welcome_message'),
                    value: 'welcome_message',
                  },
                  {
                    label: t('trigger.kind.welcome_role'),
                    value: 'welcome_role',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });
});
