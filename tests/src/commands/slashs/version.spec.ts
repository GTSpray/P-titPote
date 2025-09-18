import {
  version,
  VersionDataOpts,
} from "../../../../src/commands/slash/version.js";
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
import * as getRandomEmojiModule from "../../../../src/utils/getRandomEmoji.js";

describe("/version", () => {
  let handlerOpts: CommandHandlerOptions<VersionDataOpts>;

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
    const declaration = version.builder.setName("version");
    expect(declaration.toJSON()).toMatchObject({
      description: "Affiche la version de P'titPote Bot",
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
      const anEmote = "🫖";
      vi.spyOn(getRandomEmojiModule, "getRandomEmoji").mockReturnValue(anEmote);

      const response = await version.handler(handlerOpts);

      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: `Hello here ${anEmote}! \nJe suis P'titPote v${process.env.npm_package_version}.`,
            },
          ],
        },
      });
    });
  });
});
