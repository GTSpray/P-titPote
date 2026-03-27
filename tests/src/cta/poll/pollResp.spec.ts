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
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import { Poll } from "../../../../src/db/entities/Poll.entity.js";
import { PollStep } from "../../../../src/db/entities/PollStep.entity.js";
import { PollChoice } from "../../../../src/db/entities/PollChoice.entity.js";

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

  it("should handle a multiple-choice question", async () => {
    const allChoices = [
      new PollChoice("A first choice?", 0),
      new PollChoice("A second choice?", 1),
      new PollChoice("A third choice?", 2),
      new PollChoice("A fourth choice?", 3),
    ];

    firstStep.choices.add(allChoices);
    await em.persist(firstStep).flush();

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
              type: ComponentType.StringSelect,
              custom_id: firstStep.id,
              placeholder: "Choisis...",
              options: allChoices.map((e) => ({
                emoji: {
                  name: "▪️",
                },
                label: e.label,
                value: e.id,
              })),
            },
          },
        ],
      },
    });
  });

  describe("when the voting form contains more than 5 questions", () => {
    let allSteps: PollStep[];
    beforeEach(async () => {
      allSteps = [
        firstStep,
        new PollStep("A second question?", 1),
        new PollStep("A third question?", 2),
        new PollStep("A fourth question?", 3),
        new PollStep("A fifth question?", 4),
        new PollStep("A sixth question?", 5),
        new PollStep("A  seventh step", 6),
      ];
      aPoll.steps.add(allSteps);
      await em.persist(aPoll).flush();
    });

    it("should respond message with the first 5 steps of the poll", async () => {
      const response = await pollResp.handler(handlerOpts);
      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.Modal,
        data: {
          custom_id: expect.any(String),
          title: expect.any(String),
          components: [
            allSteps[0],
            allSteps[1],
            allSteps[2],
            allSteps[3],
            allSteps[4],
          ].map((e) => ({
            type: ComponentType.Label,
            label: e.question,
            component: expect.objectContaining({
              custom_id: e.id,
            }),
          })),
        },
      });
    });
    it.todo("should complete a form with the following 5 questions");
  });

  it.todo(
    "should respond with a temporary message indicating that the user is not authorized to vote if they do not have the required role",
  );
});
