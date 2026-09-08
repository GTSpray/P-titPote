import {
  aliasSetCommandData,
  aliasSetSubCommandData,
  set,
} from '../../../../../src/commands/slash/alias/set.js';
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import { initORM } from '../../../../initORM.js';
import { t } from '../../../../../src/i18n/index.js';

describe('/alias set', () => {
  let handlerOpts: CommandHandlerOptions<aliasSetCommandData>;

  const subcommand: aliasSetSubCommandData = {
    name: 'set',
    options: [],
    type: 1,
  };

  const data: aliasSetCommandData = {
    id: randomDiscordId19(),
    name: 'alias',
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

  it('should respond with set modal', async () => {
    const response = await set(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'aliasSet' },
        }),
        title: t('alias.modal.set.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('alias.modal.label.alias'),
            component: {
              type: ComponentType.TextInput,
              custom_id: 'alias',
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 50,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t('alias.modal.label.message'),
            component: {
              type: ComponentType.TextInput,
              custom_id: 'message',
              style: TextInputStyle.Paragraph,
              min_length: 1,
              max_length: 500,
              required: true,
            },
          },
        ],
      },
    });
  });
});
