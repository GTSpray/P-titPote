import { ApplicationIntegrationType, InteractionContextType } from "discord.js";
import { slashcommands } from "../../../src/commands/slash";

describe("slashcommands", () => {
  const commands = Object.keys(slashcommands);
  describe.each(commands)("/%s command", (commandname) => {
    const commandDesc = slashcommands[commandname];
    it("should have a desc", () => {
      expect(commandDesc).toMatchObject({
        description: expect.any(String),
        contexts: [
          InteractionContextType.BotDM,
          InteractionContextType.Guild,
          InteractionContextType.PrivateChannel,
        ],
        integration_types: [
          ApplicationIntegrationType.GuildInstall,
          ApplicationIntegrationType.UserInstall,
        ],
        handler: expect.any(Function),
      });
    });

    it("should have 1-32 character name", () => {
      expect(commandname).toMatch(/^[a-z]{1,32}$/);
    });

    it("should have 1-100 character description", () => {
      expect(commandDesc.description.length).toBeWithin(1, 100);
    });
  });
});
