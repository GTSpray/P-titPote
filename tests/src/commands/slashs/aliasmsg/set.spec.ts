import {
  AliasMsgSetSubCommandData,
  set,
} from "../../../../../src/commands/slash/aliasmsg/set.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { getInteractionHttpMock } from "../../../../mocks/getInteractionHttpMock.js";
import {
  getRandomString,
  randomDiscordId19,
} from "../../../../mocks/discord-api/utils.js";
import {
  CommandHandlerOptions,
  SubCommandOption,
} from "../../../../../src/commands/commands.js";
import { AliasMsgSetCommandData } from "../../../../../src/commands/slash/aliasmsg/set.js";
import { initORM } from "../../../../../src/db/db.js";
import { DiscordGuild } from "../../../../../src/db/entities/DiscordGuild.entity.js";
import { MessageAliased } from "../../../../../src/db/entities/MessageAliased.entity.js";
import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
  QueryOrder,
} from "@mikro-orm/mariadb";
import { expectedDiscordGuild } from "../../../../epectedEntities/expectedDiscordGuild.js";
import { expectedMessageAliased } from "../../../../epectedEntities/expectedMessageAliased.js";

describe("/aliasmsg set", () => {
  let guild_id: string;
  let handlerOpts: CommandHandlerOptions<AliasMsgSetCommandData>;

  const aliasOpts: SubCommandOption<"alias", string> = {
    name: "alias",
    type: 3,
    value: "welcome",
  };
  const msgOpts: SubCommandOption<"message", string> = {
    name: "message",
    type: 3,
    value: "Bienvenue sur le serveur de test de p'tit pote !!!!",
  };

  const subcommand: AliasMsgSetSubCommandData = {
    name: "set",
    options: [aliasOpts, msgOpts],
    type: 1,
  };

  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  beforeEach(async () => {
    const data: AliasMsgSetCommandData = {
      id: randomDiscordId19(),
      name: "aliasmsg",
      options: [subcommand],
      type: 1,
    };
    const { req, res } = getInteractionHttpMock({ data });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
    };

    guild_id = <string>req.body.guild_id;
    const { orm } = await initORM();
    em = orm.em.fork();
  });

  it("should respond success message", async () => {
    const response = await set(handlerOpts, subcommand);

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

  it("should save discord server", async () => {
    await set(handlerOpts, subcommand);

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

  it("should save aliased message", async () => {
    await set(handlerOpts, subcommand);

    em.clear();
    const msgs = await em.findAll(MessageAliased, {
      where: { server: { guildId: guild_id } },
    });
    expect(msgs).toEqual([
      expectedMessageAliased({
        alias: aliasOpts.value,
        message: msgOpts.value,
      }),
    ]);
  });

  describe("on existing server", () => {
    let guild: DiscordGuild;
    beforeEach(async () => {
      guild = new DiscordGuild(guild_id);
      await em.persist(guild).flush();
    });

    it("should not duplicate discord server", async () => {
      await set(handlerOpts, subcommand);

      em.clear();

      const servers = await em.findAll(DiscordGuild, {
        where: { guildId: guild_id },
      });

      expect(servers).toEqual([
        expectedDiscordGuild({
          guildId: guild_id,
        }),
      ]);
    });

    describe("on existing aliased message", () => {
      let messageAliased: MessageAliased;
      beforeEach(async () => {
        messageAliased = new MessageAliased(aliasOpts.value, "old message");
        guild.messageAliaseds.add(messageAliased);
        await em.persist(guild).persist(messageAliased).flush();
      });

      it("should not create duplicate aliased message", async () => {
        await set(handlerOpts, subcommand);

        em.clear();

        const msgs = await em.findAll(MessageAliased, {
          where: { server: { guildId: guild_id } },
        });
        expect(msgs).toBeArrayOfSize(1);
      });

      it("should update existing aliased message", async () => {
        await set(handlerOpts, subcommand);

        em.clear();

        const msg = await em.findOneOrFail(MessageAliased, {
          id: messageAliased.id,
        });

        expect(msg).toEqual(
          expectedMessageAliased({
            message: msgOpts.value,
          }),
        );
      });

      it("should allow to create another aliased message on this server", async () => {
        const anotherAliasOpts: SubCommandOption<"alias", string> = {
          name: "alias",
          type: 3,
          value: "anotheralias",
        };
        const anotherAliasSubCommand: AliasMsgSetSubCommandData = {
          name: "set",
          options: [anotherAliasOpts, msgOpts],
          type: 1,
        };

        const { req, res } = getInteractionHttpMock<AliasMsgSetCommandData>({
          guild_id,
          data: {
            id: randomDiscordId19(),
            name: "aliasmsg",
            options: [anotherAliasSubCommand],
            type: 1,
          },
        });

        await set({ ...handlerOpts, req, res }, anotherAliasSubCommand);

        em.clear();

        const msgs = await em.findAll(MessageAliased, {
          where: { server: { guildId: guild_id } },
          orderBy: { alias: QueryOrder.ASC },
        });

        expect(msgs).toEqual([
          expectedMessageAliased({
            alias: anotherAliasOpts.value,
            message: msgOpts.value,
          }),
          expectedMessageAliased({
            alias: messageAliased.alias,
            message: messageAliased.message,
          }),
        ]);
      });
    });
  });

  it.each([
    [
      "too_small",
      {
        inclusive: true,
        message: "Too small: expected string to have >=1 characters",
        minimum: 1,
        origin: "string",
        path: ["alias"],
      },
      "",
    ],
    [
      "invalid_format",
      {
        format: "regex",
        message: "Invalid string: must match pattern /^[a-z0-9]+$/",
        origin: "string",
        path: ["alias"],
        pattern: "/^[a-z0-9]+$/",
      },
      "#@!ù",
    ],

    [
      "too_big",
      {
        inclusive: true,
        maximum: 50,
        message: "Too big: expected string to have <=50 characters",
        origin: "string",
        path: ["alias"],
      },

      getRandomString({ length: 51, letter: true, number: false }),
    ],
  ])('should respond error on %s "alias"', async (code, issue, badAlias) => {
    const badsubcommand: AliasMsgSetSubCommandData = {
      name: "set",
      options: [
        {
          name: "alias",
          type: 3,
          value: badAlias,
        },
        msgOpts,
      ],
      type: 1,
    };

    const { req, res } = getInteractionHttpMock<AliasMsgSetCommandData>({
      data: {
        id: randomDiscordId19(),
        name: "aliasmsg",
        options: [badsubcommand],
        type: 1,
      },
    });

    const response = await set({ ...handlerOpts, req, res }, badsubcommand);

    expect(response).toMeetApiResponse(400, {
      error: "invalid subcommand payload",
      issues: expect.arrayContaining([
        {
          code,
          ...issue,
        },
      ]),
    });
  });

  it.each([
    [
      "too_small",
      {
        inclusive: true,
        message: "Too small: expected string to have >=1 characters",
        minimum: 1,
        origin: "string",
        path: ["message"],
      },
      "",
    ],

    [
      "too_big",
      {
        inclusive: true,
        maximum: 500,
        message: "Too big: expected string to have <=500 characters",
        origin: "string",
        path: ["message"],
      },

      getRandomString({ length: 501, letter: true, number: false }),
    ],
  ])(
    'should respond error on %s "message"',
    async (code, issue, badMessage) => {
      const badsubcommand: AliasMsgSetSubCommandData = {
        name: "set",
        options: [
          aliasOpts,
          {
            name: "message",
            type: 3,
            value: badMessage,
          },
        ],
        type: 1,
      };

      const { req, res } = getInteractionHttpMock<AliasMsgSetCommandData>({
        data: {
          id: randomDiscordId19(),
          name: "aliasmsg",
          options: [badsubcommand],
          type: 1,
        },
      });

      const response = await set({ ...handlerOpts, req, res }, badsubcommand);

      expect(response).toMeetApiResponse(400, {
        error: "invalid subcommand payload",
        issues: expect.arrayContaining([
          {
            code,
            ...issue,
          },
        ]),
      });
    },
  );
});
