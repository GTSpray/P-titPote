import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { getInteractionHttpMock } from "../../../../mocks/getInteractionHttpMock.js";
import { randomDiscordId19 } from "../../../../mocks/discord-api/utils.js";
import { CommandHandlerOptions } from "../../../../../src/commands/commands.js";
import {
  gimmeOtterCommandData,
  gimmeOtterSubCommandData,
  otter,
} from "../../../../../src/commands/slash/gimme/otter.js";

describe("/gimme otter", () => {
  let handlerOpts: CommandHandlerOptions<gimmeOtterCommandData>;

  const subcommand: gimmeOtterSubCommandData = {
    name: "otter",
    type: 1,
  };
  const data: gimmeOtterCommandData = {
    id: randomDiscordId19(),
    name: "gimme",
    options: [subcommand],
    type: 1,
  };

  beforeEach(() => {
    const { req, res } = getInteractionHttpMock({
      data,
    });
    handlerOpts = {
      req,
      res,
    };
  });

  it("should respond to version interaction with bot version message", async () => {
    const response = await otter(handlerOpts);

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
            type: MessageComponentTypes.SEPARATOR,
            divider: true,
            spacing: 1,
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
