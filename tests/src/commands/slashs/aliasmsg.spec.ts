import {
  aliasmsg,
  type AliasMsgDataOpts,
} from "../../../../src/commands/slash/aliasmsg.js";
import { getInteractionHttpMock } from "../../../mocks/getInteractionHttpMock.js";
import { randomDiscordId19 } from "../../../mocks/discord-api/utils.js";
import { CommandHandlerOptions } from "../../../../src/commands/commands.js";
import * as setModule from "../../../../src/commands/slash/aliasmsg/set.js";
import * as sayModule from "../../../../src/commands/slash/aliasmsg/say.js";
import * as lsModule from "../../../../src/commands/slash/aliasmsg/ls.js";
import { DBServices, initORM } from "../../../../src/db/db.js";
import { type AliasMsgSetSubCommandData } from "../../../../src/commands/slash/aliasmsg/set.js";
import { type AliasMsgSaySubCommandData } from "../../../../src/commands/slash/aliasmsg/say.js";
import { type AliasMsgLsSubCommandData } from "../../../../src/commands/slash/aliasmsg/ls.js";
import {
  InteractionContextType,
  ApplicationIntegrationType,
  PermissionFlagsBits,
} from "discord.js";

describe("/aliasmsg", () => {
  let handlerOpts: CommandHandlerOptions<AliasMsgDataOpts>;

  it("should declare a slash command", () => {
    const declaration = aliasmsg.builder.setName("aliasmsg");
    expect(declaration.toJSON()).toMatchObject({
      description: "Alias un message",
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

  describe("set subcommand", () => {
    const subcommand: AliasMsgSetSubCommandData = {
      name: "set",
      options: [
        {
          name: "alias",
          type: 3,
          value: "welcome",
        },
        {
          name: "message",
          type: 3,
          value: "Bienvenue sur le serveur de test de p'tit pote !!!!",
        },
      ],
      type: 1,
    };
    const data: setModule.AliasMsgSetCommandData = {
      id: randomDiscordId19(),
      name: "aliasmsg",
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
      const declaration = aliasmsg.builder.setName("aliasmsg");
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            description: "definit un alias message",
            name: "set",
            options: [
              {
                description: "alias du message",
                name: "alias",
              },
              {
                description: "contenu du message",
                name: "message",
              },
            ].map((e) => expect.objectContaining(e)),
          }),
        ]),
      });
    });

    it('should call "set" handler', async () => {
      using spy = vi.spyOn(setModule, "set").mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: "fakeDbServices", // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await aliasmsg.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts, subcommand);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "set" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(setModule, "set").mockResolvedValue(fakeResp);

      const response = await aliasmsg.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });

  describe("say subcommand", () => {
    const subcommand: AliasMsgSaySubCommandData = {
      name: "say",
      options: [
        {
          name: "alias",
          type: 3,
          value: "welcome",
        },
      ],
      type: 1,
    };
    const data: sayModule.AliasMsgSayCommandData = {
      id: randomDiscordId19(),
      name: "aliasmsg",
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
      const declaration = aliasmsg.builder.setName("aliasmsg");
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            description: "demande a p'titpote d'envoyer le message",
            name: "say",
            options: [
              {
                description: "alias du message",
                name: "alias",
              },
            ].map((e) => expect.objectContaining(e)),
          }),
        ]),
      });
    });

    it('should call "say" handler', async () => {
      using spy = vi.spyOn(sayModule, "say").mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: "fakeDbServices", // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await aliasmsg.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts, subcommand);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "say" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(sayModule, "say").mockResolvedValue(fakeResp);

      const response = await aliasmsg.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });

  describe("ls subcommand", () => {
    const subcommand: AliasMsgLsSubCommandData = {
      name: "ls",
      options: [],
      type: 1,
    };
    const data: lsModule.AliasMsgLsCommandData = {
      id: randomDiscordId19(),
      name: "aliasmsg",
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
      const declaration = aliasmsg.builder.setName("aliasmsg");
      expect(declaration.toJSON()).toMatchObject({
        options: expect.arrayContaining([
          expect.objectContaining({
            description: "liste les alias disponnibles sur ton serveur",
            name: "ls",
            options: [],
          }),
        ]),
      });
    });

    it('should call "ls" handler', async () => {
      using spy = vi.spyOn(lsModule, "ls").mockResolvedValue(handlerOpts.res);

      const fakeOpts = {
        ...handlerOpts,
        dbServices: "fakeDbServices", // because toHaveBeenCalledWith hang with MikroORM instance
      } as unknown as typeof handlerOpts;

      await aliasmsg.handler(fakeOpts);

      expect(spy).toHaveBeenCalledWith(fakeOpts);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return "ls" handler result', async () => {
      const fakeResp = (<unknown>{
        perceval: "j'aime les fruits en sirop",
      }) as typeof handlerOpts.res;

      vi.spyOn(lsModule, "ls").mockResolvedValue(fakeResp);

      const response = await aliasmsg.handler(handlerOpts);

      expect(response).toStrictEqual(fakeResp);
    });
  });

  describe("on invalid subcommand option", () => {
    const data = {
      id: randomDiscordId19(),
      name: "aliasmsg",
      options: [
        {
          name: "unexistingsubcommand",
        },
      ],
      type: 1,
    } as unknown as setModule.AliasMsgSetCommandData;

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
      const response = await aliasmsg.handler(handlerOpts);

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
    aliasmsg;
    const validdata = {
      id: randomDiscordId19(),
      name: "aliasmsg",
      options: [
        {
          name: "validsubcommandname",
        },
      ],
      type: 1,
    } as unknown as AliasMsgDataOpts;

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

        const response = await aliasmsg.handler(handlerOpts);

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

        const response = await aliasmsg.handler(handlerOpts);

        expect(response).toMeetApiResponse(400, {
          error: "invalid command payload",
          issues: [issue],
        });
      },
    );
  });
});
