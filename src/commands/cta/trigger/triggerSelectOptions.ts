import type { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { t } from '../../../i18n/index.js';
import { triggerKindLabel } from '../../../trigger/triggerKindLabel.js';

export function triggerSelectOptions(triggers: GuildTrigger[]) {
  return triggers.map((aTrigger) => {
    const kindLabel = triggerKindLabel(aTrigger.kind);
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
