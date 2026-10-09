import type { SlashCommandDeclaration } from '../commands.js';
import { alias } from './alias/index.js';
import { gimme } from './gimme/index.js';
import { poll } from './poll/index.js';
import { trigger } from './trigger/index.js';

export const slashcommands: Record<string, SlashCommandDeclaration<any>> = {
  alias,
  gimme,
  poll,
  trigger,
};

export const slashcommandsRegister = Object.keys(slashcommands).map((name) => {
  const { builder } = slashcommands[name];
  builder.setName(name);
  return builder.toJSON();
});
