import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { getInteractionHttpMock } from "../../../../mocks/getInteractionHttpMock.js";
import { randomDiscordId19 } from "../../../../mocks/discord-api/utils.js";
import { CommandHandlerOptions } from "../../../../../src/commands/commands.js";
import {
  gimmeVersionCommandData,
  gimmeVersionSubCommandData,
  version,
} from "../../../../../src/commands/slash/gimme/version.js";

import * as getRandomEmojiModule from "../../../../../src/utils/getRandomEmoji.js";

describe("/gimme version", () => {
  let handlerOpts: CommandHandlerOptions<gimmeVersionCommandData>;

  const subcommand: gimmeVersionSubCommandData = {
    name: "version",
    type: 1,
  };
  const data: gimmeVersionCommandData = {
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
    const anEmote = "🫖";
    vi.spyOn(getRandomEmojiModule, "getRandomEmoji").mockReturnValue(anEmote);

    const response = await version(handlerOpts);

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
