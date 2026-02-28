import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from "@mikro-orm/mariadb";
import { pollAddQ } from "../../../../src/commands/cta/poll/pollAddQ.js";
import { ModalHandlerOptions } from "../../../../src/commands/modals.js";
import { initORM } from "../../../../src/db/db.js";
import { getInteractionModalHttpMock } from "../../../mocks/getInteractionHttpMock.js";
import { DiscordGuild } from "../../../../src/db/entities/DiscordGuild.entity.js";
import { randomDiscordId19 } from "../../../mocks/discord-api/utils.js";
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import { Poll } from "../../../../src/db/entities/Poll.entity.js";
import { PollStep } from "../../../../src/db/entities/PollStep.entity.js";

describe("cta/pollAddQ", () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let existingPoll: Poll;

  beforeEach(async () => {
    const { orm } = await initORM();
    em = orm.em.fork();

    existingPoll = new Poll(`aTitre`);
    guild_id = randomDiscordId19();

    const data = {
      components: [],
      custom_id: `{"t":"cta","d":{"a":"pollAddQ", "pId": "${existingPoll.id}"}}`,
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
    aGuild.polls.add(existingPoll);
    const firstStep = new PollStep(`A first question?`, 0);
    existingPoll.steps.add(firstStep);
    await em.persist(aGuild).flush();
  });

  it("should respond a modal with a question componnent", async () => {
    const response = await pollAddQ.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: "cta",
          d: { a: "pollCreate", pId: existingPoll.id },
        }),
        title: "Ajouter une question",
        components: [
          {
            type: ComponentType.Label,
            label: `Question du sondage`,
            component: {
              type: ComponentType.TextInput,
              custom_id: `question`,
              style: TextInputStyle.Paragraph,
              min_length: 1,
              max_length: 400,
              required: true,
            },
          },
        ],
      },
    });
  });
});
