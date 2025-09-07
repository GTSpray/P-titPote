import type { SlashCommandDeclaration } from '../commands';
import { stealemoji } from './stealemoji';
import { version } from './version';

export const slashcommands: Record<
    string,
    SlashCommandDeclaration
> = {
    version,
    stealemoji,
}