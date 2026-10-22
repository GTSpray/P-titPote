import {
  ComponentSelect,
  ComponentSimple,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import {
  GuildTrigger,
  GuildTriggerKind,
  TRIGGER_LIMIT,
} from '../../../db/entities/GuildTrigger.entity.js';
import { findOrCreateGuild } from '../../../db/services/discordGuild.service.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { triggerKindLabel } from '../../../shared/trigger/triggerKindLabel.js';
import {
  ValidWelRole,
  applyRoleConfig,
  ensureAssignableRole,
  okWelRoleConfirm,
} from './welRoleShared.js';

export const trigCreateWelRole: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices }) {
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
    const parsed = ValidWelRole.safeParse({
      name: getInputComponnentById<ComponentSimple>(data, 'name')?.component
        .value,
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
    const guild = await findOrCreateGuild(em, guildId);
    await em.populate(guild, [
      'triggers',
      'triggers.messageConfig',
      'triggers.roleConfig',
    ]);

    if (guild.triggers.find((trigger) => trigger.name === parsed.data.name)) {
      return res.json(
        errorPayload(t('trigger.create.nameTaken', { name: parsed.data.name })),
      );
    }
    if (guild.triggers.length >= TRIGGER_LIMIT) {
      return res.json(errorPayload(t('errors.tooMany')));
    }

    const roleError = await ensureAssignableRole(guildId, parsed.data.roleId);
    if (roleError) {
      return res.json(roleError);
    }

    const trigger = new GuildTrigger(
      parsed.data.name,
      GuildTriggerKind.WelcomeRole,
    );
    applyRoleConfig(trigger, parsed.data);
    guild.triggers.add(trigger);

    await em.persist(guild).flush();
    return res.json(
      okWelRoleConfirm(
        t('trigger.lifecycle.created', {
          name: parsed.data.name,
          kind: triggerKindLabel(GuildTriggerKind.WelcomeRole),
        }),
      ),
    );
  },
};
