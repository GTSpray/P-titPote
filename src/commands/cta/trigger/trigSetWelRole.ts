import * as z from 'zod';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import {
  ComponentSelect,
  ComponentSimple,
  CTAData,
  type CTAEnvelope,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import {
  GuildTrigger,
  TRIGGER_LIMIT,
} from '../../../db/entities/GuildTrigger.entity.js';
import { TriggerRole } from '../../../db/entities/TriggerRole.entity.js';
import { findOrCreateGuild } from '../../../db/services/discordGuild.service.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  assertBotCanAssignRole,
  BotCannotAssignRoleError,
} from '../../../utils/assertBotCanAssignRole.js';
import { triggerNameSchema } from '../../../trigger/triggerName.js';
import { GuildTriggerKind } from '../../../trigger/GuildTriggerKind.js';
import { triggerKindLabel } from '../../../trigger/triggerKindLabel.js';

const ensureAssignableRole = async (guildId: string, roleId: string) => {
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

const ValidCreate = z.object({
  name: triggerNameSchema,
  roleId: z.string().min(1).max(50),
});

const ValidUpdate = z.object({
  name: triggerNameSchema,
  roleId: z.string().min(1).max(50),
});

const okText = (content: string) => ({
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

export const trigSetWelRole: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices, additionalData }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    const { data } = req.body;
    const { n: name } = (additionalData as CTAEnvelope<{ n?: string }>).d;

    const roleInput = getInputComponnentById<ComponentSelect>(data, 'role');

    if (name !== undefined) {
      const parsed = ValidUpdate.safeParse({
        name,
        roleId: roleInput?.component.values[0],
      });

      if (!parsed.success) {
        const issues = parsed.error.issues;
        logger.debug('zod errors', { issues });
        return res
          .status(400)
          .json({ error: t('errors.invalidSubcommandPayload'), issues });
      }

      if (!dbServices || !guildId) {
        return res.status(500).json({
          error: t('errors.unmetResult'),
        });
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

      if (trigger.roleConfig) {
        trigger.roleConfig.roleId = parsed.data.roleId;
      } else {
        const roleConfig = new TriggerRole(parsed.data.roleId);
        roleConfig.trigger = trigger;
        trigger.roleConfig = roleConfig;
      }

      await em.persist(trigger).flush();
      return res.json(
        okText(t('trigger.lifecycle.updated', { name: parsed.data.name })),
      );
    }

    const nameInput = getInputComponnentById<ComponentSimple>(data, 'name');
    const parsed = ValidCreate.safeParse({
      name: nameInput?.component.value,
      roleId: roleInput?.component.values[0],
    });

    if (!parsed.success) {
      const issues = parsed.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidSubcommandPayload'), issues });
    }

    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const guild = await findOrCreateGuild(em, guildId);
      await em.populate(guild, [
        'triggers',
        'triggers.messageConfig',
        'triggers.roleConfig',
      ]);

      const existing = guild.triggers.find(
        (aTrigger) => aTrigger.name === parsed.data.name,
      );
      if (existing) {
        return res.json(
          errorPayload(
            t('trigger.create.nameTaken', { name: parsed.data.name }),
          ),
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
      const roleConfig = new TriggerRole(parsed.data.roleId);
      roleConfig.trigger = trigger;
      trigger.roleConfig = roleConfig;
      guild.triggers.add(trigger);

      await em.persist(guild).flush();
      return res.json(
        okText(
          t('trigger.lifecycle.created', {
            name: parsed.data.name,
            kind: triggerKindLabel(GuildTriggerKind.WelcomeRole),
          }),
        ),
      );
    }

    return res.status(500).json({
      error: t('errors.unmetResult'),
    });
  },
};
