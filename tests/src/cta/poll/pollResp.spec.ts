import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from "@mikro-orm/mariadb";
import { pollResp } from "../../../../src/commands/cta/poll/pollResp.js";
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
import {
  InteractionResponseFlags,
  MessageComponentTypes,
} from "discord-interactions";

describe("cta/pollResp", () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let aPoll: Poll;
  let firstStep: PollStep;
  beforeEach(async () => {
    const { orm } = await initORM();
    em = orm.em.fork();

    aPoll = new Poll(`aTitre`);
    guild_id = randomDiscordId19();

    const data = {
      components: [],
      custom_id: `{"t":"cta","d":{"a":"pollResp", "pId": "${aPoll.id}"}}`,
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
    firstStep = new PollStep(`A first question?`, 0);
    aPoll.steps.add(firstStep);
    await em.persist(aGuild).flush();
  });

  it("should respond a message with description", async () => {
    const response = await pollResp.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: "cta",
          d: {
            a: "pollvote",
            pId: aPoll.id,
          },
        }),
        title: aPoll.title,
        components: expect.any(Array),
      },
    });
  });

  it("should handle non-multiple-choice questions", async () => {
    const response = await pollResp.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: expect.any(String),
        title: aPoll.title,
        components: [
          {
            type: ComponentType.Label,
            label: firstStep.question,
            component: {
              type: ComponentType.TextInput,
              custom_id: firstStep.id,
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 100,
              required: true,
            },
          },
        ],
      },
    });
  });

  it.todo("should handle a multiple-choice question");

  describe("when the voting form contains more than 10 questions", () => {
    it.todo("should respond message with the first 5 steps of the poll");
    it.todo("should respond message with the first 5 steps of the poll");
    it.todo("should complete a form with the following 5 questions");
  });
});
