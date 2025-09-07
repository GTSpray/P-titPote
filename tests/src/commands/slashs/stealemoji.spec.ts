import { stealemoji, stealemoji_emojiLimit, stealemoji_msgLimit, stealemoji_msgSizeLimit } from '../../../../src/commands/slash/stealemoji';
import { Request, Response } from 'express';
import { MockRequest, MockResponse } from 'node-mocks-http';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from 'discord-interactions';
import { Contexts, IntegrationTypes } from '../../../../src/commands/commands';
import { getInteractionHttpMock } from '../../../mocks/getInteractionHttpMock';
import { REST, Routes } from 'discord.js';
import { getRandomString, randomDiscordId19 } from '../../../mocks/discord-api/utils';
import { getApiMessagesChannelData } from '../../../mocks/discord-api/getApiMessageChannelData';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../../mocks/discordjs';
import { getApiMessageData } from '../../../mocks/discord-api/getApiMessageData';
import * as getEmojiUrlModule from '../../../../src/utils/getEmojiUrl';


describe('/stealemoji', () => {

  let request: MockRequest<Request>;
  let response: MockResponse<Response>;
  beforeEach(() => {
    const { req, res } = getInteractionHttpMock({
      data: {
        id: randomDiscordId19(),
        name: "stealemoji",
        type: 1
      }
    });
    request = req;
    response = res;
  })

  it('should declare a slash command', () => {
    expect(stealemoji).toMatchObject({
      description: "Récupère les 3 dernières emotes dans les 10 derniers messages de ce chan",
      contexts: [Contexts.GUILD, Contexts.BOT_DM, Contexts.PRIVATE_CHANNEL],
      integration_types: [IntegrationTypes.GUILD_INSTALL, IntegrationTypes.USER_INSTALL],
      handler: expect.any(Function)
    });
  });

  describe('handler', () => {

    const notFoundMessagePayload = {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: `ahem... j'ai rien trouvé... 🤷`
          }
        ]
      },
    };

    let channel_id: string;
    beforeEach(() => {
      channel_id = request.body.channel.id || 'failed mock response';
      jest.spyOn(getEmojiUrlModule, 'getEmojiUrl').mockResolvedValue('no mock')
    })

    it(`should use discord api to fetch last ${stealemoji_msgLimit} messages of current channel`, async () => {

      const getSpy = jest.spyOn(REST.prototype, 'get')

      DiscrodRESTMock.register({
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id)
      }, getApiMessagesChannelData({ channel_id, length: 0 }));

      await stealemoji.handler(request, response);

      expect(getSpy).toHaveBeenCalledWith(Routes.channelMessages(channel_id), {
        query: new URLSearchParams({
          limit: `${stealemoji_msgLimit}`
        })
      })
    })

    it('should respond "not found" message when no message in channel', async () => {

      DiscrodRESTMock.register({
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id)
      }, getApiMessagesChannelData({ channel_id, length: 0 }));

      await stealemoji.handler(request, response);

      expect(response).toMeetApiResponse(200, notFoundMessagePayload);
    })

    it(`should respond "not found" message when last ${stealemoji_msgLimit} messages contains no emoji`, async () => {
      DiscrodRESTMock.register({
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id)
      }, getApiMessagesChannelData({ channel_id, length: stealemoji_msgLimit }));

      await stealemoji.handler(request, response);

      expect(response).toMeetApiResponse(200, notFoundMessagePayload);
    })

    const n = 'Str0ngB0ng0Cat';
    const i18 = getRandomString({ length: 18, number: true });
    const i19 = getRandomString({ length: 19, number: true });
    const i20 = getRandomString({ length: 20, number: true });

    describe.each([
      [`<a:${n}:${i18}>`, n, i18],
      [`<:${n}:${i18}>`, n, i18],
      [`<a:${n}:${i19}>`, n, i19],
      [`<a:${n}:${i20}>`, n, i20]
    ])(`when last ${stealemoji_msgLimit} messages contains an emoji like %s`, (emojiText, emojiName, emojiId) => {

      beforeEach(() => {
        const contentMessageWithEmoji = `${emojiText}`
        const result = [
          ...getApiMessagesChannelData({ channel_id, length: 3 }),
          getApiMessageData({ channel_id, content: contentMessageWithEmoji }),
          ...getApiMessagesChannelData({ channel_id, length: 3 })
        ]

        DiscrodRESTMock.register({
          verb: DiscrodRESTMockVerb.get,
          fullRoute: Routes.channelMessages(channel_id)
        }, result);

      })

      it(`should call getEmojiUrl to determine emoji "format"`, async () => {

        const getEmojiUrlSpy = jest.spyOn(getEmojiUrlModule, 'getEmojiUrl');
        await stealemoji.handler(request, response);

        expect(getEmojiUrlSpy).toHaveBeenCalledWith(emojiId);
        expect(getEmojiUrlSpy).toHaveBeenCalledTimes(1);
      })

      it(`should respond found message with  emoji url and ${emojiName} as desciption `, async () => {

        const url = `http://amockedurl/${emojiId}.png`;
        jest.spyOn(getEmojiUrlModule, 'getEmojiUrl').mockResolvedValue(url)

        await stealemoji.handler(request, response);
        expect(response).toMeetApiResponse(200, {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: "Voilà.. ce que j'ai trouvé"
              },
              {
                type: MessageComponentTypes.MEDIA_GALLERY,
                items: [
                  {
                    description: emojiName,
                    media: { url },
                  }
                ]
              }
            ]
          },
        });
      })
    })

    it(`should limit to ${stealemoji_emojiLimit} emote in response`, async () => {

      const content = Array.from({ length: stealemoji_emojiLimit + 3 }, (_e, i) => `<a:${n}${i}:${i18}${i}>`).join(' ')
      const result = [
        getApiMessageData({ channel_id, content }),
        getApiMessageData({ channel_id, content }),
        getApiMessageData({ channel_id, content }),
      ]

      DiscrodRESTMock.register({
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id)
      }, result);

      await stealemoji.handler(request, response);
      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: expect.any(String)
            },
            {
              type: MessageComponentTypes.MEDIA_GALLERY,
              items: expect.toBeArrayOfSize(stealemoji_emojiLimit)
            }
          ]
        },
      });

    })

    it(`should deal with duplicate emotes`, async () => {
      const sameEmoteId = i18;
      DiscrodRESTMock.register({
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id)
      }, [
        getApiMessageData({ channel_id, content: `<a:${n}1:${sameEmoteId}>` }),
        getApiMessageData({ channel_id, content: `<a:${n}2:${sameEmoteId}>` }),
        getApiMessageData({ channel_id, content: `<a:${n}3:${sameEmoteId}>` }),
      ]);

      await stealemoji.handler(request, response);
      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: expect.any(String)
            },
            {
              type: MessageComponentTypes.MEDIA_GALLERY,
              items: expect.toBeArrayOfSize(1)
            }
          ]
        },
      });
    })

    it(`should ignore messages longer than ${stealemoji_msgSizeLimit} characters`,  async () => {
      const sameEmoteId = i18;
      DiscrodRESTMock.register({
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id)
      }, [
        getApiMessageData({ channel_id, content: `${ getRandomString({ length: stealemoji_msgSizeLimit, number: true })} <a:${n}1:${sameEmoteId}>` }),
      ]);

      await stealemoji.handler(request, response);
      expect(response).toMeetApiResponse(200, notFoundMessagePayload);
    })

  });
})



