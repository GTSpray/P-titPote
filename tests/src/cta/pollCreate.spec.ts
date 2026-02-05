import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from "@mikro-orm/mariadb";
import { pollCreate } from "../../../src/commands/cta/poll/pollCreate.js";
import {
  ModalHandlerOptions,
} from "../../../src/commands/modals.js";
import { initORM } from "../../../src/db/db.js";
import { getInteractionModalHttpMock } from "../../mocks/getInteractionHttpMock.js";
import { DiscordGuild } from "../../../src/db/entities/DiscordGuild.entity.js";
import { expectedDiscordGuild } from "../../epectedEntities/expectedDiscordGuild.js";
import { randomDiscordId19 } from "../../mocks/discord-api/utils.js";

describe("cta/pollCreate", () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;

  beforeEach(async () => {
    const data = {
      components: [
        {
          component: {
            custom_id: "question",
            id: 2,
            type: 4,
            value: "Une question",
          },
          id: 1,
          type: 18,
        },
        {
          component: {
            custom_id: "choice0",
            id: 4,
            type: 4,
            value: "Un choix 1",
          },
          id: 3,
          type: 18,
        },
        {
          component: {
            custom_id: "choice1",
            id: 6,
            type: 4,
            value: "Un choix 2",
          },
          id: 5,
          type: 18,
        },
      ],
      custom_id:
        `{"t":"cta","d":{"a":"pollCreate","role":"${randomDiscordId19()}"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({ data });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id)
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
});
