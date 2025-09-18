import {
  gimmeotter,
  GimmeotterDataOpts,
} from "../../../../src/commands/slash/gimmeotter.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { getInteractionHttpMock } from "../../../mocks/getInteractionHttpMock.js";
import { randomDiscordId19 } from "../../../mocks/discord-api/utils.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
} from "discord.js";
import { CommandHandlerOptions } from "../../../../src/commands/commands.js";

describe("/gimmeotter", () => {
  let handlerOpts: CommandHandlerOptions<GimmeotterDataOpts>;

  beforeEach(() => {
    const { req, res } = getInteractionHttpMock({
      data: {
        id: randomDiscordId19(),
        name: "version",
        type: 1,
      },
    });
    handlerOpts = {
      req,
      res,
    };
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
      const response = await gimmeotter.handler(handlerOpts);

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
