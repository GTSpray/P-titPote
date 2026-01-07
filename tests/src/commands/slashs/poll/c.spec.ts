import { getInteractionHttpMock } from "../../../../mocks/getInteractionHttpMock.js";
import { randomDiscordId19 } from "../../../../mocks/discord-api/utils.js";
import {
  CommandHandlerOptions,
  SubCommandOption,
} from "../../../../../src/commands/commands.js";
import { initORM } from "../../../../../src/db/db.js";
import {
  c,
  pollCCommandData,
  pollCSubCommandData,
} from "../../../../../src/commands/slash/poll/c.js";
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
} from "discord-api-types/v10";
import { DiscordGuild } from "../../../../../src/db/entities/DiscordGuild.entity.js";
import { expectedDiscordGuild } from "../../../../epectedEntities/expectedDiscordGuild.js";
import {
  AbstractSqlConnection,
  AbstractSqlDriver,
  AbstractSqlPlatform,
  SqlEntityManager,
  t,
} from "@mikro-orm/mariadb";
import { Poll } from "../../../../../src/db/entities/Poll.entity.js";
import { expectedPoll } from "../../../../epectedEntities/expectedPoll.js";
import {
  InteractionResponseFlags,
  MessageComponentTypes,
} from "discord-interactions";

describe("/poll c", () => {
  let guild_id: string;
  let handlerOpts: CommandHandlerOptions<pollCCommandData>;

  const questionOpts: SubCommandOption<"question", string> = {
    name: "question",
    type: 3,
    value: "quelqu'un qui dit le mal d'une personne?",
  };

  const roleOpts: SubCommandOption<"role", string> = {
    name: "role",
    type: 3,
    value: randomDiscordId19(),
  };

  const subcommand: pollCSubCommandData = {
    name: "c",
    options: [questionOpts, roleOpts],
    type: 1,
  };

  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  beforeEach(async () => {
    const data: pollCCommandData = {
      id: randomDiscordId19(),
      name: "poll",
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

  it("should save discord server", async () => {
    await c(handlerOpts, subcommand);

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
    await c(handlerOpts, subcommand);

    em.clear();
    const polls = await em.findAll(Poll, {
      where: { server: { guildId: guild_id } },
    });
    expect(polls).toEqual([
      expectedPoll({
        question: questionOpts.value,
        role: roleOpts.value,
      }),
    ]);
  });

  it("should save without role", async () => {
    const subcommand: pollCSubCommandData = {
      name: "c",
      options: [questionOpts],
      type: 1,
    };
    const data: pollCCommandData = {
      id: randomDiscordId19(),
      name: "poll",
      options: [subcommand],
      type: 1,
    };
    const { req, res } = getInteractionHttpMock({ guild_id, data });
    await c(
      {
        ...handlerOpts,
        req,
        res,
      },
      subcommand,
    );

    em.clear();

    const polls = await em.findAll(Poll, {
      where: { server: { guildId: guild_id } },
    });
    expect(polls).toEqual([
      expectedPoll({
        question: questionOpts.value,
        role: null,
      }),
    ]);
  });

  it("should respond success message and include ne poll id in custom_id", async () => {
    const response = await c(handlerOpts, subcommand);

    em.clear();
    const poll = await em.findOne(Poll, {
      server: { guildId: guild_id },
    });

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
                content: poll?.question,
              },
            ],
            accessory: {
              type: MessageComponentTypes.THUMBNAIL,
              media: {
                url: `https://raw.githubusercontent.com/GTSpray/P-titPote/poll/assets/ptitpote-sam.png?salt=${poll?.id}`,
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
                    a: "pollresp",
                    pId: poll?.id,
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
