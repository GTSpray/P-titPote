import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from "@mikro-orm/mariadb";
import { pollPub } from "../../../../src/commands/cta/poll/pollPub.js";
import { ModalHandlerOptions } from "../../../../src/commands/modals.js";
import { initORM } from "../../../../src/db/db.js";
import { getInteractionModalHttpMock } from "../../../mocks/getInteractionHttpMock.js";
import { DiscordGuild } from "../../../../src/db/entities/DiscordGuild.entity.js";
import { randomDiscordId19 } from "../../../mocks/discord-api/utils.js";
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import { Poll } from "../../../../src/db/entities/Poll.entity.js";
import { PollStep } from "../../../../src/db/entities/PollStep.entity.js";
import { InteractionResponseFlags, MessageComponentTypes } from "discord-interactions";

describe("cta/pollPub", () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let aPoll: Poll;

  beforeEach(async () => {
    const { orm } = await initORM();
    em = orm.em.fork();

    aPoll = new Poll(`aTitre`);
    guild_id = randomDiscordId19();

    const data = {
      components: [],
      custom_id: `{"t":"cta","d":{"a":"pollPub", "pId": "${aPoll.id}"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({ data, guild_id });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    };

    const aGuild = new DiscordGuild(guild_id);
    aGuild.polls.add(aPoll);
    const firstStep = new PollStep(`A first question?`, 0);
    aPoll.steps.add(firstStep);
    await em.persist(aGuild).flush();
  });

  it("should respond à message with descrition", async () => {
    const response = await pollPub.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              flags: InteractionResponseFlags.IS_COMPONENTS_V2,
              components: [
                {
                  type: MessageComponentTypes.SECTION,
                  components: [
                    {
                      type: MessageComponentTypes.TEXT_DISPLAY,
                      content:
                        "# Oyé Oyé!\n-# Le staff réclame votre attention pour un sondage!",
                    },
                    {
                      type: MessageComponentTypes.TEXT_DISPLAY,
                      content: aPoll.title,
                    },
                  ],
                  accessory: {
                    type: MessageComponentTypes.THUMBNAIL,
                    media: {
                      url: `https://raw.githubusercontent.com/GTSpray/P-titPote/poll/assets/ptitpote-sam.png?salt=${aPoll.id}`,
                    },
                  },
                },
                {
                  type: MessageComponentTypes.SEPARATOR,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.Button,
                      style: ButtonStyle.Primary,
                      label: "Je vote!",
                      custom_id: JSON.stringify({
                        t: "cta",
                        d: {
                          a: "pollResp",
                          pId: aPoll.id,
                        },
                      }),
                    },
                  ],
                },
              ],
            },
          });
  });
});
