import * as z from 'zod';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { TriggerRole } from '../../../db/entities/TriggerRole.entity.js';
import { logger } from '../../../logger.js';
import { errorPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  assertBotCanAssignRole,
  BotCannotAssignRoleError,
} from '../../../utils/assertBotCanAssignRole.js';
import { triggerNameSchema } from '../../../trigger/triggerName.js';

export const ValidWelRole = z.object({
  name: triggerNameSchema,
  roleId: z.string().min(1).max(50),
});

export type WelRoleInput = z.infer<typeof ValidWelRole>;

export const ensureAssignableRole = async (guildId: string, roleId: string) => {
  try {
    await assertBotCanAssignRole(guildId, roleId);
    return null;
  } catch (error) {
    if (error instanceof BotCannotAssignRoleError) {
      return errorPayload(error.toUserMessage());
    }
    logger.error('trigger role assignability check failed', {
      guildId,
      roleId,
      error,
    });
    return errorPayload(t('trigger.role.unavailable'));
  }
};

export const okWelRoleConfirm = (content: string) => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.TextDisplay,
        content,
      },
    ],
  },
});

export const applyRoleConfig = (
  trigger: GuildTrigger,
  { roleId }: Pick<WelRoleInput, 'roleId'>,
) => {
  if (trigger.roleConfig) {
    trigger.roleConfig.roleId = roleId;
    return;
  }
  const roleConfig = new TriggerRole(roleId);
  roleConfig.trigger = trigger;
  trigger.roleConfig = roleConfig;
};
