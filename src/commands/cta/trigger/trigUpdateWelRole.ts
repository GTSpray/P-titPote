import {
  type ComponentSelect,
  type CTAData,
  type CTAEnvelope,
  getInputComponnentById,
  type ModalHandlerDelcaration,
} from '../../modals.js';
import {
  GuildTrigger,
  GuildTriggerKind,
} from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import {
  assertInteractionUserCanManageRoles,
  assertInteractionUserIsModerator,
} from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  assertBotCanAssignRole,
  BotCannotAssignRoleError,
} from '../../../utils/assertBotCanAssignRole.js';
import {
  ValidWelRole,
  applyRoleConfig,
  okWelRoleConfirm,
} from '../../../shared/trigger/welRoleShared.js';

export const trigUpdateWelRole: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices, additionalData }) {
    try {
      assertInteractionUserIsModerator(req.body);
      assertInteractionUserCanManageRoles(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    if (!dbServices || !guildId) {
      return res.status(500).json({ error: t('errors.unmetResult') });
    }

    const { data } = req.body;
    const { n: name } = (additionalData as CTAEnvelope<{ n: string }>).d;
    const parsed = ValidWelRole.safeParse({
      name,
      roleId: getInputComponnentById<ComponentSelect>(data, 'role')?.component
        .values[0],
    });

    if (!parsed.success) {
      const issues = parsed.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidSubcommandPayload'), issues });
    }

    try {
      await assertBotCanAssignRole(guildId, parsed.data.roleId);
    } catch (error) {
      if (error instanceof BotCannotAssignRoleError) {
        return res.json(errorPayload(error.toUserMessage()));
      }
      logger.error('trigger role assignability check failed', {
        guildId,
        roleId: parsed.data.roleId,
        error,
      });
      return res.json(errorPayload(t('trigger.role.unavailable')));
    }

    const em = dbServices.orm.em.fork();
    const trigger = await em.findOneOrFail(
      GuildTrigger,
      {
        server: { guildId },
        name: parsed.data.name,
        kind: GuildTriggerKind.WelcomeRole,
      },
      { populate: ['messageConfig', 'roleConfig'] },
    );

    applyRoleConfig(trigger, parsed.data);
    await em.persist(trigger).flush();
    return res.json(
      okWelRoleConfirm(
        t('trigger.lifecycle.updated', { name: parsed.data.name }),
      ),
    );
  },
};
