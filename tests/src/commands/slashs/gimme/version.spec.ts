import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import {
  gimmeVersionCommandData,
  gimmeVersionSubCommandData,
  version,
} from '../../../../../src/commands/slash/gimme/version.js';

import * as getRandomEmojiModule from '../../../../../src/utils/getRandomEmoji.js';
import { t } from '../../../../../src/i18n/index.js';

describe('/gimme version', () => {
  let handlerOpts: CommandHandlerOptions<gimmeVersionCommandData>;

  const subcommand: gimmeVersionSubCommandData = {
    name: 'version',
    type: 1,
  };
  const data: gimmeVersionCommandData = {
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
    const anEmote = '🫖';
    vi.spyOn(getRandomEmojiModule, 'getRandomEmoji').mockReturnValue(anEmote);

    const response = await version(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('gimme.version.message', {
              emoji: anEmote,
              version: `${process.env.npm_package_version}`,
            }),
          },
        ],
      },
    });
  });
});
