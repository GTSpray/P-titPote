import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from "@mikro-orm/mariadb";
import { pollAddC, STEP_CHOICE_LIMIT } from "../../../../src/commands/cta/poll/pollAddC.js";
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
import { PollChoice } from "../../../../src/db/entities/PollChoice.entity.js";

describe("cta/pollAddC", () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let existingPoll: Poll;
  let firstStep: PollStep;

  beforeEach(async () => {
    const { orm } = await initORM();
    em = orm.em.fork();

    existingPoll = new Poll(`aTitre`);
    guild_id = randomDiscordId19();

    const aGuild = new DiscordGuild(guild_id);
    aGuild.polls.add(existingPoll);
    firstStep = new PollStep(`A first question?`, 0);
    existingPoll.steps.add(firstStep);
    await em.persist(aGuild).flush();

    const data = {
      components: [],
      custom_id: `{"t":"cta","d":{"a":"pollAddC", "sId": "${firstStep.id}"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({ data, guild_id });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    };
  });

  it("should respond a modal", async () => {
    const response = await pollAddC.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: "cta",
          d: { a: "pollCreate", pId: existingPoll.id },
        }),
        title: "Ajouter des choix",
        components: expect.any(Array)
      },
    });
  });

  it("should respond a modal with a text display componnent as question summary", async () => {
    const response = await pollAddC.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: expect.any(String),
        title: expect.any(String),
        components: expect.arrayContaining([
          {
            type: ComponentType.TextDisplay,
            content: `# ${existingPoll.steps[0].question}\n`
          }
        ])
      },
    });
  });

  it("should respond a modal with 4 labels max due to discord limit", async () => {
    const response = await pollAddC.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: expect.any(String),
        title: expect.any(String),
        components: [
          {
            type: ComponentType.TextDisplay,
            content: expect.any(String)
          },
          ...Array.from({ length: 4 }).map((_e, i) => {
            const choiceOrder = i + 1;
            return {
              type: ComponentType.Label,
              label: `Choix n°${choiceOrder}`,
              component: {
                type: ComponentType.TextInput,
                custom_id: `choice${choiceOrder}`,
                style: TextInputStyle.Short,
                min_length: 1,
                max_length: 100,
                required: expect.any(Boolean),
              },
            };
          }),
        ],
      },
    });
  });

  it("should respond a modal with 2 required input text because a select input need 2 choices minimumn", async () => {
    const response = await pollAddC.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: expect.objectContaining({
        components: [
          {
            type: ComponentType.TextDisplay,
            content: expect.any(String)
          },
          ...Array.from({ length: 2 }).map(() => {
            return expect.objectContaining({
              component: expect.objectContaining({
                required: true,
              })
            })
          }),
          ...Array.from({ length: 2 }).map(() => {
            return expect.objectContaining({
              component: expect.objectContaining({
                required: false,
              })
            })
          }),
        ],
      }),
    });
  });

  it("should respond a modal with no required input text when step had already 2 choices", async () => {
    firstStep.choices.add([
      new PollChoice('A first choice', 0),
      new PollChoice('A second choice', 1),
    ]);
    await em.persist(firstStep).flush();

    const response = await pollAddC.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: expect.objectContaining({
        components: [
          {
            type: ComponentType.TextDisplay,
            content: expect.any(String)
          },
          ...Array.from({ length: 4 }).map(() => {
            return expect.objectContaining({
              component: expect.objectContaining({
                required: false,
              })
            })
          })
        ],
      }),
    });
  });

  it("should support step with long list of choices", async () => {
    const stepSize = 20
    firstStep.choices.add(
      Array.from({ length: stepSize }).map((e, i) => new PollChoice(`choice n°${i}`, i))
    );
    await em.persist(firstStep).flush();

    const response = await pollAddC.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: expect.objectContaining({
        components: [
          {
            type: ComponentType.TextDisplay,
            content: expect.any(String)
          },
          ...Array.from({ length: 4 }).map((e, i) => {
            const choiceOrder = stepSize + i + 1
            return expect.objectContaining({
              label: `Choix n°${choiceOrder}`,
              component: expect.objectContaining({
                custom_id: `choice${choiceOrder}`,
              })
            })
          })
        ],
      }),
    });
  });

  it.todo(`should respond an ephemeral message when step has ${STEP_CHOICE_LIMIT} choice`)

});
