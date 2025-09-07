import { version } from '../../../../src/commands/slash/version';
import { Request, Response } from 'express';
import { MockRequest, MockResponse } from 'node-mocks-http';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from 'discord-interactions';
import { Contexts, IntegrationTypes } from '../../../../src/commands/commands';
import { getInteractionHttpMock } from '../../../mocks/getInteractionHttpMock';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils';


const mockedEmote = '🫖 🫖 🫖';
jest.mock('../../../../src/utils/getRandomEmoji', () => ({
  getRandomEmoji: jest.fn().mockImplementation(() => {
    return mockedEmote;
  })
}));

describe('/version', () => {

  let request: MockRequest<Request>;
  let response: MockResponse<Response>;

  beforeEach(() => {
    const { req, res } = getInteractionHttpMock({
      data: {
        id: randomDiscordId19(),
        name: "version",
        type: 1
      }
    })
    request = req;
    response = res;
  })

  it('should declare a slash command', () => {
    expect(version).toMatchObject({
      description: 'Affiche la version de P\'titPote Bot',
      contexts: [Contexts.GUILD, Contexts.BOT_DM, Contexts.PRIVATE_CHANNEL],
      integration_types: [IntegrationTypes.GUILD_INSTALL, IntegrationTypes.USER_INSTALL],
      handler: expect.any(Function)
    });
  });

  describe('handler', () => {

    it('should respond to version interaction with bot version message', async () => {

      await version.handler(request, response);

      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: `Hello here ${mockedEmote}! \nJe suis P'titPote v${process.env.npm_package_version}.`
            }
          ]
        },
      });
    })

  })


})



