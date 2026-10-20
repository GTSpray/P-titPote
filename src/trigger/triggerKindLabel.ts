import { t, type TranslationKey } from '../i18n/index.js';
import { GuildTriggerKind } from './GuildTriggerKind.js';

const kindLabelKey: Record<GuildTriggerKind, TranslationKey> = {
  [GuildTriggerKind.WelcomeMessage]: 'trigger.kind.welcome_message',
  [GuildTriggerKind.WelcomeRole]: 'trigger.kind.welcome_role',
};

export const triggerKindLabel = (kind: GuildTriggerKind) =>
  t(kindLabelKey[kind]);
