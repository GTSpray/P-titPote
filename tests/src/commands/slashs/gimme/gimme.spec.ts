import {
  gimme,
  type gimmeDataOpts,
} from "../../../../../src/commands/slash/gimme/index.js";
import { getInteractionHttpMock } from "../../../../mocks/getInteractionHttpMock.js";
import { randomDiscordId19 } from "../../../../mocks/discord-api/utils.js";
import { CommandHandlerOptions } from "../../../../../src/commands/commands.js";
import * as otterModule from "../../../../../src/commands/slash/gimme/otter.js";
import * as emojiModule from "../../../../../src/commands/slash/gimme/emoji.js";
import { DBServices, initORM } from "../../../../../src/db/db.js";
import {
  InteractionContextType,
  ApplicationIntegrationType,
  PermissionFlagsBits,
} from "discord.js";
import {
  stealemoji_emojiLimit,
  stealemoji_msgLimit,
} from "../../../../../src/commands/slash/gimme/emoji.js";

describe("/gimme", () => {
  let handlerOpts: CommandHandlerOptions<gimmeDataOpts>;

  it("should declare a slash command", () => {
    const declaration = gimme.builder.setName("gimme");
    expect(declaration.toJSON()).toMatchObject({
      description: "Récupère une image",
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

  describe("otter subcommand", () => {
    const subcommand: otterModule.gimmeOtterSubCommandData = {
      name: "otter",
      type: 1,
    };
    const data: otterModule.gimmeOtterCommandData = {
      id: randomDiscordId19(),
      name: "gimme",
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    it("should be declared as subcommand", () => {
      const declaration = gimme.builder.setName("gimme");
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            description: "Affiche une image de loutre",
            name: "otter",
            options: [],
          }),
        ]),
      });
    });

    it('should call "otter" handler', async () => {
      using spy = vi
        .spyOn(otterModule, "otter")
        .mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: "fakeDbServices", // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await gimme.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "otter" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(otterModule, "otter").mockResolvedValue(fakeResp);

      const response = await gimme.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });

  describe("emoji subcommand", () => {
    const subcommand: emojiModule.gimmeEmojiSubCommandData = {
      name: "emoji",
      type: 1,
    };
    const data: emojiModule.gimmeEmojiCommandData = {
      id: randomDiscordId19(),
      name: "gimme",
      options: [subcommand],
      type: 1,
    };

    beforeEach(async () => {
      const { req, res } = getInteractionHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    it("should be declared as subcommand", () => {
      const declaration = gimme.builder.setName("gimme");
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            description: `Récupère les ${emojiModule.stealemoji_emojiLimit} dernières emotes dans les ${emojiModule.stealemoji_msgLimit} derniers messages de ce chan`,
            name: "emoji",
            options: [],
          }),
        ]),
      });
    });

    it('should call "emoji" handler', async () => {
      using spy = vi
        .spyOn(emojiModule, "emoji")
        .mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: "fakeDbServices", // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await gimme.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "emoji" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(emojiModule, "emoji").mockResolvedValue(fakeResp);

      const response = await gimme.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });

  describe("on invalid subcommand option", () => {
    const data = {
      id: randomDiscordId19(),
      name: "gimme",
      options: [
        {
          name: "unexistingsubcommand",
        },
      ],
      type: 1,
    } as unknown as otterModule.gimmeOtterCommandData;

    beforeEach(async () => {
      const { req, res } = getInteractionHttpMock({ data });
      const dbServices = await initORM();
      handlerOpts = {
        req,
        res,
        dbServices,
      };
    });

    it("should return invalid subcommand result", async () => {
      const response = await gimme.handler(handlerOpts);

      expect(response).toMeetApiResponse(400, {
        error: "invalid subcommand",
        context: {
          subcommandName: data.options[0].name,
        },
      });
    });
  });

  describe("on invalid command option", () => {
    let dbServices: DBServices;
    gimme;
    const validdata = {
      id: randomDiscordId19(),
      name: "gimme",
      options: [
        {
          name: "validsubcommandname",
        },
      ],
      type: 1,
    } as unknown as otterModule.gimmeOtterCommandData;

    beforeEach(async () => {
      dbServices = await initORM();
    });

    it.each([
      [
        "invalid_type",
        {
          code: "invalid_type",
          expected: "array",
          message: "Invalid input: expected array, received undefined",
          path: ["options"],
        },
        {
          ...validdata,
          options: undefined,
        },
      ],
      [
        "too_small",
        {
          code: "too_small",
          inclusive: true,
          message: "Too small: expected array to have >=1 items",
          minimum: 1,
          origin: "array",
          path: ["options"],
        },
        {
          ...validdata,
          options: [],
        },
      ],
    ])(
      "should return invalid command result when %s options",
      async (_code, issue, data) => {
        const { req, res } = getInteractionHttpMock({
          data,
        });

        let handlerOpts: any = { req, res, dbServices };

        const response = await gimme.handler(handlerOpts);

        expect(response).toMeetApiResponse(400, {
          error: "invalid command payload",
          issues: [issue],
        });
      },
    );

    it.each([
      [
        "invalid_type",
        {
          code: "invalid_type",
          expected: "string",
          message: "Invalid input: expected string, received undefined",
          path: ["name"],
        },
        {
          ...validdata,
          name: undefined,
        },
      ],
    ])(
      "should return invalid command result when %s name",
      async (_code, issue, data) => {
        const { req, res } = getInteractionHttpMock({
          data,
        });

        let handlerOpts: any = { req, res, dbServices };

        const response = await gimme.handler(handlerOpts);

        expect(response).toMeetApiResponse(400, {
          error: "invalid command payload",
          issues: [issue],
        });
      },
    );
  });
});
