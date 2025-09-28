import {
  aliasLsCommandData,
  aliasLsSubCommandData,
  ls,
} from "../../../../../src/commands/slash/alias/ls.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { getInteractionHttpMock } from "../../../../mocks/getInteractionHttpMock.js";
import { randomDiscordId19 } from "../../../../mocks/discord-api/utils.js";
import { CommandHandlerOptions } from "../../../../../src/commands/commands.js";
import { initORM } from "../../../../../src/db/db.js";
import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from "@mikro-orm/mariadb";
import { DiscordGuild } from "../../../../../src/db/entities/DiscordGuild.entity.js";
import { MessageAliased } from "../../../../../src/db/entities/MessageAliased.entity.js";

describe("/alias ls", () => {
  let guild_id: string;
  let handlerOpts: CommandHandlerOptions<aliasLsCommandData>;

  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  const notFoundMessagePayload = {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "ahem... j'ai rien trouvé... 🤷",
    },
  };

  beforeEach(async () => {
    const subcommand: aliasLsSubCommandData = {
      name: "ls",
      options: [],
      type: 1,
    };
    const data: aliasLsCommandData = {
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
  });

  describe("when guild has aliased messages", () => {
    let messageAliaseds: MessageAliased[];
    beforeEach(async () => {
      const guild = new DiscordGuild(guild_id);

      messageAliaseds = [
        new MessageAliased(`alias1`, "alias1 content"),
        new MessageAliased(`alias2`, "alias2 content"),
        new MessageAliased(`alias3`, "alias3 content"),
      ];

      messageAliaseds.forEach(async (e) => {
        guild.messageAliaseds.add(e);
      });
      await em.persist(guild).flush();
    });

    it("should respond with aliased message names", async () => {
      const response = await ls(handlerOpts);

      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: "Voilà.. ce que j'ai trouvé",
            },
            {
              type: MessageComponentTypes.SEPARATOR,
              divider: true,
              spacing: 1,
            },
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: messageAliaseds.map((e) => `* ${e.alias}`).join("\n"),
            },
          ],
        },
      });
    });

    it("should not display soft deleted alias", async () => {
      const softDeleted = messageAliaseds[1];
      softDeleted.deletedAt = new Date();
      await em.persist(softDeleted).flush();
      em.clear();

      const response = await ls(handlerOpts);

      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: "Voilà.. ce que j'ai trouvé",
            },
            {
              type: MessageComponentTypes.SEPARATOR,
              divider: true,
              spacing: 1,
            },
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: expect.not.stringContaining(softDeleted.alias),
            },
          ],
        },
      });
    });

    it("should display not found message when all alias are soft deleted", async () => {
      messageAliaseds.forEach((e) => {
        e.deletedAt = new Date();
        em.persist(e);
      });
      await em.flush();
      em.clear();

      const response = await ls(handlerOpts);

      expect(response).toMeetApiResponse(200, notFoundMessagePayload);
    });

    it("should not display other guild's alias", async () => {
      const otherGuild = new DiscordGuild(randomDiscordId19());
      const otherAlias = new MessageAliased(
        `otherguildalias`,
        "an other guild aliased message content",
      );
      otherGuild.messageAliaseds.add(otherAlias);
      await em.persist(otherAlias).flush();
      em.clear();

      const response = await ls(handlerOpts);

      expect(response).toMeetApiResponse(200, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: "Voilà.. ce que j'ai trouvé",
            },
            {
              type: MessageComponentTypes.SEPARATOR,
              divider: true,
              spacing: 1,
            },
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: expect.not.stringContaining(otherAlias.alias),
            },
          ],
        },
      });
    });
  });

  it("should display not found message when no alias", async () => {
    const response = await ls(handlerOpts);

    expect(response).toMeetApiResponse(200, notFoundMessagePayload);
  });
});
