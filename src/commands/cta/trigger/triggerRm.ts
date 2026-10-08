import * as z from 'zod';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import {
  ComponentSelect,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

const ValidTriggerRm = z.object({
  name: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
  action: z.enum(['enable', 'disable', 'delete']),
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

export const triggerRm: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    const { data } = req.body;

    const triggerInput = getInputComponnentById<ComponentSelect>(
      data,
      'trigger',
    );
    const actionInput = getInputComponnentById<ComponentSelect>(data, 'action');

    const parsed = ValidTriggerRm.safeParse({
      name: triggerInput?.component.values[0],
      action: actionInput?.component.values[0],
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
      const trigger = await em.findOne(GuildTrigger, {
        server: { guildId },
        name: parsed.data.name,
      });

      if (!trigger) {
        return res.json(
          errorPayload(t('trigger.rm.notFound', { name: parsed.data.name })),
        );
      }

      if (parsed.data.action === 'enable') {
        if (trigger.enabled) {
          return res.json(
            errorPayload(
              t('trigger.rm.alreadyEnabled', { name: parsed.data.name }),
            ),
          );
        }
        trigger.enabled = true;
        await em.persist(trigger).flush();
        return res.json(
          okText(t('trigger.rm.enabled', { name: parsed.data.name })),
        );
      }

      if (parsed.data.action === 'disable') {
        if (!trigger.enabled) {
          return res.json(
            errorPayload(
              t('trigger.rm.alreadyDisabled', { name: parsed.data.name }),
            ),
          );
        }
        trigger.enabled = false;
        await em.persist(trigger).flush();
        return res.json(
          okText(t('trigger.rm.disabled', { name: parsed.data.name })),
        );
      }

      trigger.deletedAt = new Date();
      await em.persist(trigger).flush();
      return res.json(
        okText(t('trigger.rm.deleted', { name: parsed.data.name })),
      );
    }

    return res.status(500).json({
      error: t('errors.unmetResult'),
    });
  },
};
