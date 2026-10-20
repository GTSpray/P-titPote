import * as z from 'zod';
import {
  InteractionResponseType,
  Routes,
  type RESTGetAPIGuildResult,
} from 'discord-api-types/v10';
import {
  CTASelectData,
  type CTAEnvelope,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { discordapi } from '../../../utils/discordapi.js';
import { interpolateTriggerMessage } from '../../../trigger/interpolateTriggerMessage.js';
import { triggerNameSchema } from '../../../trigger/triggerName.js';
import { GuildTriggerKind } from '../../../trigger/GuildTriggerKind.js';

const ValidPreview = z.object({
  name: triggerNameSchema,
});

export const trigPreviewWelMsg: ModalHandlerDelcaration<CTASelectData> = {
  async handler({ req, res, dbServices, additionalData }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const parsed = ValidPreview.safeParse({
      name: (additionalData as CTAEnvelope<{ n?: string }>).d.n,
    });
    if (!parsed.success) {
      const issues = parsed.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidSubcommandPayload'), issues });
    }

    const guildId = req.body.guild_id;
    if (!dbServices || !guildId) {
      return res.status(500).json({ error: t('errors.unmetResult') });
    }

    const em = dbServices.orm.em.fork();
    const trigger = await em.findOne(
      GuildTrigger,
      {
        server: { guildId },
        name: parsed.data.name,
        kind: GuildTriggerKind.WelcomeMessage,
      },
      { populate: ['messageConfig'] },
    );

    const template = trigger?.messageConfig?.message;
    if (!template) {
      return res.json(
        errorPayload(
          t('trigger.lifecycle.notFound', { name: parsed.data.name }),
        ),
      );
    }

    const user = req.body.member?.user ?? req.body.user;
    const userId = user?.id;
    if (!userId) {
      return res.status(500).json({ error: t('errors.unmetResult') });
    }
    const username = user?.username ?? userId;

    let serverName = guildId;
    try {
      const guild = (await discordapi.get(
        Routes.guild(guildId),
      )) as RESTGetAPIGuildResult;
      serverName = guild.name;
    } catch (err) {
      logger.error('welcome preview guild fetch failed', { guildId, err });
    }

    const content = interpolateTriggerMessage(template, {
      userId,
      username,
      serverName,
    });

    return res.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content },
    });
  },
};
