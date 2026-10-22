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
  GuildTriggerKind,
} from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  assertBotCanPostInChannel,
  BotCannotPostInChannelError,
} from '../../../utils/assertBotCanPostInChannel.js';
import {
  ValidWelMsg,
  applyMessageConfig,
  okWelMsgConfirm,
} from '../../../shared/trigger/welMsgShared.js';

export const trigUpdateWelMsg: ModalHandlerDelcaration<CTAData> = {
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
    const parsed = ValidWelMsg.safeParse({
      name,
      channelId: getInputComponnentById<ComponentSelect>(data, 'channel')
        ?.component.values[0],
      message: getInputComponnentById<ComponentSimple>(data, 'message')
        ?.component.value,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidSubcommandPayload'), issues });
    }

    try {
      await assertBotCanPostInChannel(guildId, parsed.data.channelId);
    } catch (error) {
      if (error instanceof BotCannotPostInChannelError) {
        return res.json(errorPayload(error.toUserMessage()));
      }
      logger.error('trigger channel postability check failed', {
        guildId,
        channelId: parsed.data.channelId,
        error,
      });
      return res.json(errorPayload(t('trigger.channel.unavailable')));
    }

    const em = dbServices.orm.em.fork();
    const trigger = await em.findOneOrFail(
      GuildTrigger,
      {
        server: { guildId },
        name: parsed.data.name,
        kind: GuildTriggerKind.WelcomeMessage,
      },
      { populate: ['messageConfig', 'roleConfig'] },
    );

    applyMessageConfig(trigger, parsed.data);
    await em.persist(trigger).flush();
    return res.json(
      okWelMsgConfirm(
        t('trigger.lifecycle.updated', { name: parsed.data.name }),
        parsed.data.name,
      ),
    );
  },
};
