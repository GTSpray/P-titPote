import {
  ComponentSelect,
  CTAData,
  type CTAEnvelope,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import {
  GuildTrigger,
  GuildTriggerKind,
} from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  ValidWelRole,
  applyRoleConfig,
  ensureAssignableRole,
  okWelRoleConfirm,
} from './welRoleShared.js';

export const trigUpdateWelRole: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices, additionalData }) {
    try {
      assertInteractionUserIsModerator(req.body);
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

    const em = dbServices.orm.em.fork();
    const trigger = await em.findOne(
      GuildTrigger,
      {
        server: { guildId },
        name: parsed.data.name,
        kind: GuildTriggerKind.WelcomeRole,
      },
      { populate: ['messageConfig', 'roleConfig'] },
    );
    if (!trigger) {
      return res.json(
        errorPayload(
          t('trigger.lifecycle.notFound', { name: parsed.data.name }),
        ),
      );
    }

    const roleError = await ensureAssignableRole(guildId, parsed.data.roleId);
    if (roleError) {
      return res.json(roleError);
    }

    applyRoleConfig(trigger, parsed.data);
    await em.persist(trigger).flush();
    return res.json(
      okWelRoleConfirm(
        t('trigger.lifecycle.updated', { name: parsed.data.name }),
      ),
    );
  },
};
