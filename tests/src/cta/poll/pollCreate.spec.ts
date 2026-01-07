import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from "@mikro-orm/mariadb";
import { pollCreate } from "../../../../src/commands/cta/poll/pollCreate.js";
import { ModalHandlerOptions } from "../../../../src/commands/modals.js";
import { initORM } from "../../../../src/db/db.js";
import { getInteractionModalHttpMock } from "../../../mocks/getInteractionHttpMock.js";
import { DiscordGuild } from "../../../../src/db/entities/DiscordGuild.entity.js";
import { expectedDiscordGuild } from "../../../epectedEntities/expectedDiscordGuild.js";
import { randomDiscordId19 } from "../../../mocks/discord-api/utils.js";
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
} from "discord-api-types/v10";
import { InteractionResponseFlags } from "discord-interactions";
import { expectedPoll } from "../../../epectedEntities/expectedPoll.js";
import { Poll } from "../../../../src/db/entities/Poll.entity.js";
import {
  getModalLabelComponnents,
  PartialComponentList,
  PartialComponentSingle,
} from "../../../helpers/getModalLabelComponnents.js";
import { PollStep } from "../../../../src/db/entities/PollStep.entity.js";
import { expectedPollStep } from "../../../epectedEntities/expectedPollStep.js";
import { PollChoice } from "../../../../src/db/entities/PollChoice.entity.js";
import { expectedPollChoice } from "../../../epectedEntities/expectedPollChoice.js";

describe("cta/pollCreate", () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;

  describe("on init poll", () => {
    let aTitreCmp: PartialComponentSingle;
    let aQuestionCmp: PartialComponentSingle;
    let aRoleCmp: PartialComponentList;

    beforeEach(async () => {
      aTitreCmp = {
        custom_id: "title",
        type: ComponentType.TextInput,
        value: "Le titre du sondage",
      };

      aQuestionCmp = {
        custom_id: "question",
        type: ComponentType.TextInput,
        value: "La question du sondage?",
      };

      aRoleCmp = {
        custom_id: "role",
        type: ComponentType.RoleSelect,
        values: [randomDiscordId19()],
      };

      const data = {
        components: getModalLabelComponnents([
          aTitreCmp,
          aRoleCmp,
          aQuestionCmp,
        ]),
        custom_id: `{"t":"cta","d":{"a":"pollCreate"}}`,
      };
      const { req, res } = getInteractionModalHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
        additionalData: JSON.parse(data.custom_id),
      };
      guild_id = <string>req.body.guild_id;
      const { orm } = await initORM();
      em = orm.em.fork();
    });

    it("should save discord server", async () => {
      await pollCreate.handler(handlerOpts);

      em.clear();
      const server = await em.findOneOrFail(DiscordGuild, {
        guildId: guild_id,
      });

      expect(server).toEqual(
        expectedDiscordGuild({
          guildId: guild_id,
        }),
      );
    });

    it("should save poll with role", async () => {
      await pollCreate.handler(handlerOpts);

      em.clear();
      const polls = await em.findAll(Poll, {
        where: { server: { guildId: guild_id } },
      });
      expect(polls).toEqual([
        expectedPoll({
          title: <string>aTitreCmp.value,
          role: <string>aRoleCmp.values[0],
        }),
      ]);
    });

    it.each([
      {
        custom_id: "role",
        type: ComponentType.RoleSelect,
        values: [""],
      },
      {
        custom_id: "role",
        type: ComponentType.RoleSelect,
        values: [],
      },
      undefined,
    ])("should save poll with %o as role", async (role) => {
      const data = {
        components: getModalLabelComponnents(
          [aTitreCmp, role, aQuestionCmp].filter((e) => !!e),
        ),
        custom_id: `{"t":"cta","d":{"a":"pollCreate"}}`,
      };
      const { req, res } = getInteractionModalHttpMock({ data, guild_id });
      handlerOpts = {
        req,
        res,
        dbServices: handlerOpts.dbServices,
        additionalData: JSON.parse(data.custom_id),
      };

      await pollCreate.handler(handlerOpts);

      em.clear();
      const polls = await em.findAll(Poll, {
        where: { server: { guildId: guild_id } },
      });
      expect(polls).toEqual([
        expectedPoll({
          title: <string>aTitreCmp.value,
          role: null,
        }),
      ]);
    });

    it("should respond a ephemeral message because poll is not ready", async () => {
      const response = await pollCreate.handler(handlerOpts);
      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: expect.any(String),
          components: expect.any(Array),
        },
      });
    });

    it("should respond a message with only title and first question as summary", async () => {
      const response = await pollCreate.handler(handlerOpts);

      em.clear();
      const poll = await em.findOneOrFail(
        Poll,
        {
          server: { guildId: guild_id },
        },
        { populate: ["steps"] },
      );

      const firstStep = poll.steps[0];

      const expectedSummary = [
        `## ${poll.title}`,
        "",
        `**1. ${firstStep.question}**`,
      ].join("\n");

      expect(response).toMeetApiResponse(200, {
        type: expect.anything(),
        data: {
          flags: expect.anything(),
          content: expectedSummary,
          components: expect.any(Array),
        },
      });
    });

    it("should add ActionRow componnent to invite user to complete poll", async () => {
      const response = await pollCreate.handler(handlerOpts);

      em.clear();
      const poll = await em.findOneOrFail(
        Poll,
        {
          server: { guildId: guild_id },
        },
        { populate: ["steps"] },
      );

      const firstStep = poll.steps[0];

      expect(response).toMeetApiResponse(200, {
        type: expect.anything(),
        data: {
          flags: expect.anything(),
          content: expect.anything(),
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Ajouter des choix",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollAddC",
                      sId: firstStep?.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Nouvelle question",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollAddQ",
                      pId: poll.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Publier le sondage",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollPub",
                      pId: poll.id,
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

  describe("on pollAddQ cta", () => {
    let aQuestionCmp: PartialComponentSingle;
    let existingPoll: Poll;

    beforeEach(async () => {
      const { orm } = await initORM();
      em = orm.em.fork();

      existingPoll = new Poll(`aTitre`);
      guild_id = randomDiscordId19();

      aQuestionCmp = {
        custom_id: "question",
        type: ComponentType.TextInput,
        value: "Une deuxième question?",
      };

      const data = {
        components: getModalLabelComponnents([aQuestionCmp]),
        custom_id: `{"t":"cta","d":{"a":"pollCreate", "pId": "${existingPoll.id}"}}`,
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

    it("should save new question", async () => {
      await pollCreate.handler(handlerOpts);

      em.clear();
      const pollSteps = await em.findAll(PollStep, {
        where: { poll: existingPoll.id },
        populate: ["choices"],
        orderBy: {
          order: "ASC",
        },
      });

      expect(pollSteps).toEqual([
        expectedPollStep({
          question: `A first question?`,
          order: 0,
        }),
        expectedPollStep({
          question: <string>aQuestionCmp.value,
          order: 1,
        }),
      ]);
    });

    it("should respond a ephemeral message because poll is not ready", async () => {
      const response = await pollCreate.handler(handlerOpts);
      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: expect.any(String),
          components: expect.any(Array),
        },
      });
    });

    it("should respond a message with title and two questions as summary", async () => {
      const response = await pollCreate.handler(handlerOpts);

      em.clear();
      const poll = await em.findOneOrFail(
        Poll,
        {
          id: existingPoll.id,
        },
        { populate: ["steps"] },
      );

      const expectedSummary = [
        `## ${poll.title}`,
        "",
        `**1. ${poll.steps[0].question}**`,
        `**2. ${poll.steps[1].question}**`,
      ].join("\n");

      expect(response).toMeetApiResponse(200, {
        type: expect.anything(),
        data: {
          flags: expect.anything(),
          content: expectedSummary,
          components: expect.any(Array),
        },
      });
    });

    it("should add ActionRow componnent to invite user to complete poll", async () => {
      const response = await pollCreate.handler(handlerOpts);

      em.clear();
      const pollSteps = await em.findAll(PollStep, {
        where: { poll: existingPoll.id },
        orderBy: {
          order: "DESC",
        },
      });

      const lastStep = pollSteps[0];

      expect(response).toMeetApiResponse(200, {
        type: expect.anything(),
        data: {
          flags: expect.anything(),
          content: expect.anything(),
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Ajouter des choix",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollAddC",
                      sId: lastStep?.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Nouvelle question",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollAddQ",
                      pId: existingPoll.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Publier le sondage",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollPub",
                      pId: existingPoll.id,
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

  describe("on pollAddC cta", () => {
    let aFirstChoiceCmp: PartialComponentSingle;
    let aSecondChoiceCmp: PartialComponentSingle;
    let existingPollStep: PollStep;
    beforeEach(async () => {
      const { orm } = await initORM();
      em = orm.em.fork();

      const existingPoll = new Poll(`aTitre`);
      guild_id = randomDiscordId19();

      aFirstChoiceCmp = {
        custom_id: "choice1",
        type: ComponentType.TextInput,
        value: "Un choix 1",
      };
      aSecondChoiceCmp = {
        custom_id: "choice2",
        type: ComponentType.TextInput,
        value: "Un deuxieme",
      };

      const data = {
        components: getModalLabelComponnents([
          aFirstChoiceCmp,
          aSecondChoiceCmp,
        ]),
        custom_id: `{"t":"cta","d":{"a":"pollCreate", "pId": "${existingPoll.id}"}}`,
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
      existingPollStep = new PollStep(`A first question?`, 0);
      existingPoll.steps.add(existingPollStep);
      await em.persist(aGuild).flush();
    });

    it("should save new question choice", async () => {
      await pollCreate.handler(handlerOpts);

      em.clear();
      const choices = await em.findAll(PollChoice, {
        where: { pollstep: existingPollStep.id },
        orderBy: {
          order: "ASC",
        },
      });

      expect(choices).toEqual([
        expectedPollChoice({
          label: <string>aFirstChoiceCmp.value,
          order: 0,
        }),
        expectedPollChoice({
          label: <string>aSecondChoiceCmp.value,
          order: 1,
        }),
      ]);
    });

    it("should respond a ephemeral message because poll is not ready", async () => {
      const response = await pollCreate.handler(handlerOpts);
      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: expect.any(String),
          components: expect.any(Array),
        },
      });
    });

    it("should respond a message with title and two questions as summary", async () => {
      const response = await pollCreate.handler(handlerOpts);

      em.clear();
      const poll = await em.findOneOrFail(
        Poll,
        {
          id: existingPollStep.poll.id,
        },
        { populate: ["steps"] },
      );

      const expectedSummary = [
        `## ${poll.title}`,
        "",
        `**1. ${poll.steps[0].question}**`,
        `- ${aFirstChoiceCmp.value}`,
        `- ${aSecondChoiceCmp.value}`,
      ].join("\n");

      expect(response).toMeetApiResponse(200, {
        type: expect.anything(),
        data: {
          flags: expect.anything(),
          content: expectedSummary,
          components: expect.any(Array),
        },
      });
    });

    it("should add ActionRow componnent to invite user to complete poll", async () => {
      const response = await pollCreate.handler(handlerOpts);

      em.clear();
      const pollSteps = await em.findAll(PollStep, {
        where: { poll: existingPollStep.poll.id },
        orderBy: {
          order: "DESC",
        },
      });

      const lastStep = pollSteps[0];

      expect(response).toMeetApiResponse(200, {
        type: expect.anything(),
        data: {
          flags: expect.anything(),
          content: expect.anything(),
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Ajouter des choix",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollAddC",
                      sId: lastStep?.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Nouvelle question",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollAddQ",
                      pId: existingPollStep.poll.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Publier le sondage",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollPub",
                      pId: existingPollStep.poll.id,
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
});
