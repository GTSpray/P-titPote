import {
  aliasmsg,
  AliasmsgDataOpts,
} from "../../../../src/commands/slash/aliasmsg.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { getInteractionHttpMock } from "../../../mocks/getInteractionHttpMock.js";
import { randomDiscordId19 } from "../../../mocks/discord-api/utils.js";
import { CommandHandlerOptions } from "../../../../src/commands/commands.js";
import { AliasMsgSetCommandData } from "../../../../src/commands/slash/aliasmsg/set.js";
import { initORM } from "../../../../src/db/db.js";

describe("/aliasmsg", () => {
  describe("set option", () => {
    let handlerOpts: CommandHandlerOptions<AliasMsgSetCommandData>;
    beforeEach(async () => {
      const data: AliasMsgSetCommandData = {
        id: randomDiscordId19(),
        name: "aliasmsg",
        options: [
          {
            name: "set",
            options: [
              {
                name: "alias",
                type: 3,
                value: "welcome",
              },
              {
                name: "message",
                type: 3,
                value: "Bienvenue sur le serveur de test de p'tit pote !!!!",
              },
            ],
            type: 1,
          },
        ],
        type: 1,
      };
      const { req, res } = getInteractionHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    describe("handler", () => {
      it("should respond to version interaction with bot version message", async () => {
        const response = await aliasmsg.handler(handlerOpts);

        expect(response).toMeetApiResponse(200, {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: "Ok! C'est noté ;)",
              },
            ],
          },
        });
      });
    });
  });
});
