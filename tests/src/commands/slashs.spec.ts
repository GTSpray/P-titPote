import {
  ApplicationIntegrationType,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { slashcommands } from "../../../src/commands/slash";

describe("slashcommands", () => {
  const commands = Object.keys(slashcommands);
  describe.each(commands)("/%s command", (commandname) => {
    const commandDefinition = slashcommands[commandname];
    it("should have a command builder", () => {
      expect(commandDefinition).toMatchObject({
        builder: expect.any(SlashCommandBuilder),
        handler: expect.any(Function),
      });
    });

    it("should have 1-32 character name", () => {
      expect(commandname).toMatch(/^[a-z]{1,32}$/);
    });

    it("should have 1-100 character description", () => {
      const desc = commandDefinition.builder.description;
      expect(desc.length).toBeWithin(1, 100);
    });
  });
});
