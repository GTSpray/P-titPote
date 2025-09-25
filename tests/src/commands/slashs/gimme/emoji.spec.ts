import { Request } from "express";
import { MockRequest } from "node-mocks-http";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { getInteractionHttpMock } from "../../../../mocks/getInteractionHttpMock.js";
import { REST, Routes } from "discord.js";
import {
  getRandomString,
  randomDiscordId19,
} from "../../../../mocks/discord-api/utils.js";
import { getApiMessagesChannelData } from "../../../../mocks/discord-api/getApiMessageChannelData.js";
import {
  DiscrodRESTMock,
  DiscrodRESTMockVerb,
} from "../../../../mocks/discordjs.js";
import { getApiMessageData } from "../../../../mocks/discord-api/getApiMessageData.js";
import * as getEmojiUrlModule from "../../../../../src/utils/getEmojiUrl.js";
import { CommandHandlerOptions } from "../../../../../src/commands/commands.js";
import {
  emoji,
  gimmeEmojiCommandData,
  gimmeEmojiSubCommandData,
  stealemoji_emojiLimit,
  stealemoji_msgLimit,
  stealemoji_msgSizeLimit,
} from "../../../../../src/commands/slash/gimme/emoji.js";
describe("/gimme emoji", () => {
  let request: MockRequest<Request>;
  let handlerOpts: CommandHandlerOptions<gimmeEmojiCommandData>;

  const subcommand: gimmeEmojiSubCommandData = {
    name: "emoji",
    type: 1,
  };
  const data: gimmeEmojiCommandData = {
    id: randomDiscordId19(),
    name: "gimme",
    options: [subcommand],
    type: 1,
  };
  const notFoundMessagePayload = {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      components: [
        {
          type: MessageComponentTypes.TEXT_DISPLAY,
          content: `ahem... j'ai rien trouvé... 🤷`,
        },
      ],
    },
  };

  let channel_id: string;

  beforeEach(() => {
    const { req, res } = getInteractionHttpMock({
      data,
    });
    request = req;
    handlerOpts = {
      req,
      res,
    };

    channel_id = request.body.channel.id || "failed mock response";
    vi.spyOn(getEmojiUrlModule, "getEmojiUrl").mockResolvedValue("no mock");
  });

  it(`should use discord api to fetch last ${stealemoji_msgLimit} messages of current channel`, async () => {
    const getSpy = vi.spyOn(REST.prototype, "get");

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id),
      },
      getApiMessagesChannelData({ channel_id, length: 0 }),
    );

    await emoji(handlerOpts);

    expect(getSpy).toHaveBeenCalledWith(Routes.channelMessages(channel_id), {
      query: new URLSearchParams({
        limit: `${stealemoji_msgLimit}`,
      }),
    });
  });

  it('should respond "not found" message when no message in channel', async () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id),
      },
      getApiMessagesChannelData({ channel_id, length: 0 }),
    );

    const response = await emoji(handlerOpts);
    expect(response).toMeetApiResponse(200, notFoundMessagePayload);
  });

  it(`should respond "not found" message when last ${stealemoji_msgLimit} messages contains no emoji`, async () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id),
      },
      getApiMessagesChannelData({ channel_id, length: stealemoji_msgLimit }),
    );

    const response = await emoji(handlerOpts);
    expect(response).toMeetApiResponse(200, notFoundMessagePayload);
  });

  const n = "Str0ngB0ng0Cat";
  const i18 = getRandomString({ length: 18, number: true });
  const i19 = getRandomString({ length: 19, number: true });
  const i20 = getRandomString({ length: 20, number: true });

  describe.each([
    [`<a:${n}:${i18}>`, n, i18],
    [`<:${n}:${i18}>`, n, i18],
    [`<a:${n}:${i19}>`, n, i19],
    [`<a:${n}:${i20}>`, n, i20],
  ])(
    `when last ${stealemoji_msgLimit} messages contains an emoji like %s`,
    (emojiText, emojiName, emojiId) => {
      beforeEach(() => {
        const contentMessageWithEmoji = `${emojiText}`;
        const result = [
          ...getApiMessagesChannelData({ channel_id, length: 3 }),
          getApiMessageData({ channel_id, content: contentMessageWithEmoji }),
          ...getApiMessagesChannelData({ channel_id, length: 3 }),
        ];

        DiscrodRESTMock.register(
          {
            verb: DiscrodRESTMockVerb.get,
            fullRoute: Routes.channelMessages(channel_id),
          },
          result,
        );
      });

      it(`should call getEmojiUrl to determine emoji "format"`, async () => {
        const getEmojiUrlSpy = vi.spyOn(getEmojiUrlModule, "getEmojiUrl");
        await emoji(handlerOpts);

        expect(getEmojiUrlSpy).toHaveBeenCalledWith(emojiId);
        expect(getEmojiUrlSpy).toHaveBeenCalledTimes(1);
      });

      it(`should respond found message with  emoji url and ${emojiName} as desciption `, async () => {
        const url = `http://amockedurl/${emojiId}.png`;
        vi.spyOn(getEmojiUrlModule, "getEmojiUrl").mockResolvedValue(url);

        const response = await emoji(handlerOpts);
        expect(response).toMeetApiResponse(200, {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: "Voilà.. ce que j'ai trouvé",
              },
              {
                type: MessageComponentTypes.MEDIA_GALLERY,
                items: [
                  {
                    description: emojiName,
                    media: { url },
                  },
                ],
              },
            ],
          },
        });
      });
    },
  );

  it(`should limit to ${stealemoji_emojiLimit} emote in response`, async () => {
    const content = Array.from(
      { length: stealemoji_emojiLimit + 3 },
      (_e, i) => `<a:${n}${i}:${i18}${i}>`,
    ).join(" ");
    const result = [
      getApiMessageData({ channel_id, content }),
      getApiMessageData({ channel_id, content }),
      getApiMessageData({ channel_id, content }),
    ];

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id),
      },
      result,
    );

    const response = await emoji(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: expect.any(String),
          },
          {
            type: MessageComponentTypes.MEDIA_GALLERY,
            items: expect.toBeArrayOfSize(stealemoji_emojiLimit),
          },
        ],
      },
    });
  });

  it(`should deal with duplicate emotes`, async () => {
    const sameEmoteId = i18;
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id),
      },
      [
        getApiMessageData({
          channel_id,
          content: `<a:${n}1:${sameEmoteId}>`,
        }),
        getApiMessageData({
          channel_id,
          content: `<a:${n}2:${sameEmoteId}>`,
        }),
        getApiMessageData({
          channel_id,
          content: `<a:${n}3:${sameEmoteId}>`,
        }),
      ],
    );

    const response = await emoji(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: expect.any(String),
          },
          {
            type: MessageComponentTypes.MEDIA_GALLERY,
            items: expect.toBeArrayOfSize(1),
          },
        ],
      },
    });
  });

  it(`should ignore messages longer than ${stealemoji_msgSizeLimit} characters`, async () => {
    const sameEmoteId = i18;
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(channel_id),
      },
      [
        getApiMessageData({
          channel_id,
          content: `${getRandomString({ length: stealemoji_msgSizeLimit, number: true })} <a:${n}1:${sameEmoteId}>`,
        }),
      ],
    );

    const response = await emoji(handlerOpts);
    expect(response).toMeetApiResponse(200, notFoundMessagePayload);
  });
});
