import { Contexts, IntegrationTypes } from "../../../src/commands/commands";
import { slashcommands } from "../../../src/commands/slash";

describe("slashcommands", () => {
  const commands = Object.keys(slashcommands);
  describe.each(commands)("/%s command", (command) => {
    const commandDesc = slashcommands[command];
    it("should have a desc", () => {
      expect(commandDesc).toMatchObject({
        description: expect.any(String),
        contexts: [Contexts.GUILD, Contexts.BOT_DM, Contexts.PRIVATE_CHANNEL],
        integration_types: [
          IntegrationTypes.GUILD_INSTALL,
          IntegrationTypes.USER_INSTALL,
        ],
        handler: expect.any(Function),
      });
    });
  });
});
