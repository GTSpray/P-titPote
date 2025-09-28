import {
  aliasSayCommandData,
  aliasSaySubCommandData,
  say,
} from "../../../../../src/commands/slash/alias/say.js";
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
import { initORM } from "../../../../../src/db/db.js";
import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from "@mikro-orm/mariadb";
import { DiscordGuild } from "../../../../../src/db/entities/DiscordGuild.entity.js";
import { MessageAliased } from "../../../../../src/db/entities/MessageAliased.entity.js";

describe("/alias say", () => {
  let guild_id: string;
  let handlerOpts: CommandHandlerOptions<aliasSayCommandData>;

  const aliasOpts: SubCommandOption<"alias", string> = {
    name: "alias",
    type: 3,
    value: "welcome",
  };

  const subcommand: aliasSaySubCommandData = {
    name: "say",
    options: [aliasOpts],
    type: 1,
  };

  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  let messageAliased: MessageAliased;
  beforeEach(async () => {
    const data: aliasSayCommandData = {
      id: randomDiscordId19(),
      name: "alias",
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

    const guild = new DiscordGuild(guild_id);
    messageAliased = new MessageAliased(
      aliasOpts.value,
      "an example of aliased message content",
    );
    guild.messageAliaseds.add(messageAliased);
    await em.persist(guild).persist(messageAliased).flush();
  });

  it("should respond with aliased message content", async () => {
    const response = await say(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: messageAliased.message,
          },
        ],
      },
    });
  });

  it("should not respond with aliased message content of another guild", async () => {
    const { req, res } = getInteractionHttpMock({
      guild_id: randomDiscordId19(),
      data: <aliasSayCommandData>{
        id: randomDiscordId19(),
        name: "alias",
        options: [subcommand],
        type: 1,
      },
    });
    const response = await say({ ...handlerOpts, req, res }, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.EPHEMERAL,
        content: `ahem... il n'y pas d'alias "${aliasOpts.value}" 🤷`,
      },
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
    const badsubcommand: aliasSaySubCommandData = {
      name: "say",
      options: [
        {
          name: "alias",
          type: 3,
          value: badAlias,
        },
      ],
      type: 1,
    };

    const { req, res } = getInteractionHttpMock<aliasSayCommandData>({
      data: {
        id: randomDiscordId19(),
        name: "alias",
        options: [badsubcommand],
        type: 1,
      },
    });

    const response = await say({ ...handlerOpts, req, res }, badsubcommand);

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
});
