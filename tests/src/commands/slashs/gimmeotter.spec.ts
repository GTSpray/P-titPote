import { gimmeotter } from "../../../../src/commands/slash/gimmeotter";
import { Request, Response } from "express";
import { MockRequest, MockResponse } from "node-mocks-http";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { getInteractionHttpMock } from "../../../mocks/getInteractionHttpMock";
import { randomDiscordId19 } from "../../../mocks/discord-api/utils";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
} from "discord.js";

describe("/version", () => {
  let request: MockRequest<Request>;
  let response: MockResponse<Response>;

  beforeEach(() => {
    const { req, res } = getInteractionHttpMock({
      data: {
        id: randomDiscordId19(),
        name: "version",
        type: 1,
      },
    });
    request = req;
    response = res;
  });

  it("should declare a slash command", () => {
    const declaration = gimmeotter.builder.setName("gimmeotter");
    expect(declaration.toJSON()).toMatchObject({
      description: "Affiche une image de loutre",
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
    });
  });

  describe("handler", () => {
    it("should respond to version interaction with bot version message", async () => {
      await gimmeotter.handler(request, response);

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
                  description: "otter",
                  media: {
                    url: "https://github.com/GTSpray/P-titPote/raw/main/assets/otter.png?raw=true",
                  },
                },
              ],
            },
          ],
        },
      });
    });
  });
});
