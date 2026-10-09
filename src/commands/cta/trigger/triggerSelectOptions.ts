import { t } from '../../../i18n/index.js';
import type { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';

export function triggerSelectOptions(triggers: GuildTrigger[]) {
  return triggers.map((aTrigger) => {
    const kindLabel =
      aTrigger.kind === 'welcome_message'
        ? t('trigger.kind.welcome_message')
        : t('trigger.kind.welcome_role');
    const statusLabel = aTrigger.enabled
      ? t('trigger.status.enabled')
      : t('trigger.status.disabled');
    return {
      label: aTrigger.name,
      value: aTrigger.name,
      description: `${kindLabel} — ${statusLabel}`.slice(0, 100),
    };
  });
}
