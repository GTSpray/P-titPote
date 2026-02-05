import {
  poll,
  type pollDataOpts,
} from "../../../../../src/commands/slash/poll/index.js";
import * as setModule from "../../../../../src/commands/slash/poll/c.js";
import { getInteractionCommandHttpMock } from "../../../../mocks/getInteractionHttpMock.js";
import { randomDiscordId19 } from "../../../../mocks/discord-api/utils.js";
import { CommandHandlerOptions } from "../../../../../src/commands/commands.js";
import { initORM } from "../../../../../src/db/db.js";
import { type pollCSubCommandData } from "../../../../../src/commands/slash/poll/c.js";
import {
  InteractionContextType,
  ApplicationIntegrationType,
  PermissionFlagsBits,
} from "discord.js";

describe("/poll", () => {
  let handlerOpts: CommandHandlerOptions<pollDataOpts>;

  it("should declare a slash command", () => {
    const declaration = poll.builder.setName("poll");
    expect(declaration.toJSON()).toMatchObject({
      description: "Gestion de sondage",
      contexts: [
        InteractionContextType.BotDM,
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel,
      ],
      integration_types: [
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall,
      ],
      default_member_permissions: `${Number(PermissionFlagsBits.SendMessages)}`,
      options: expect.any(Array),
    });
  });

  describe("create subcommand", () => {
    const subcommand: pollCSubCommandData = {
      name: "c",
      options: [
        {
          name: "question",
          type: 3,
          value: "welcome",
        },
        {
          name: "role",
          type: 3,
          value: randomDiscordId19(),
        },
      ],
      type: 1,
    };
    const data: setModule.pollCCommandData = {
      id: randomDiscordId19(),
      name: "poll",
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionCommandHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    it("should be declared as subcommand", () => {
      const declaration = poll.builder.setName(subcommand.name);
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            name: subcommand.name,
            description: "créer un sondage",
            options: [
              {
                description: "question à laquelle les sondées repondent",
                name: "question",
              },
              {
                description: "rôle des sondées",
                name: "role",
              },
            ].map((e) => expect.objectContaining(e)),
          }),
        ]),
      });
    });

    it('should call "set" handler', async () => {
      using spy = vi.spyOn(setModule, "c").mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: "fakeDbServices", // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await poll.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts, subcommand);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "set" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(setModule, "c").mockResolvedValue(fakeResp);

      const response = await poll.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });
});
