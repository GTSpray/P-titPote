import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import {
  gimmeOtterCommandData,
  gimmeOtterSubCommandData,
  otter,
} from '../../../../../src/commands/slash/gimme/otter.js';
import { t } from '../../../../../src/i18n/index.js';

describe('/gimme otter', () => {
  let handlerOpts: CommandHandlerOptions<gimmeOtterCommandData>;

  const subcommand: gimmeOtterSubCommandData = {
    name: 'otter',
    type: 1,
  };
  const data: gimmeOtterCommandData = {
    id: randomDiscordId19(),
    name: 'gimme',
    options: [subcommand],
    type: 1,
  };

  beforeEach(() => {
    const { req, res } = getInteractionCommandHttpMock({
      data,
    });
    handlerOpts = {
      req,
      res,
    };
  });

  it('should respond to version interaction with bot version message', async () => {
    const response = await otter(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('common.foundIt'),
          },
          {
            type: ComponentType.Separator,
            divider: true,
            spacing: 1,
          },
          {
            type: ComponentType.MediaGallery,
            items: [
              {
                description: 'otter',
                media: {
                  url: 'https://github.com/GTSpray/P-titPote/raw/main/assets/otter.png?raw=true',
                },
              },
            ],
          },
        ],
      },
    });
  });
});
