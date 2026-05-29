import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import { CTAData, ModalHandlerDelcaration } from "../../modals.js";
import {
  InteractionResponseFlags,
  MessageComponentTypes,
} from "discord-interactions";
import { Poll } from "../../../db/entities/Poll.entity.js";
import { logger } from "../../../logger.js";
import { assertInteractionUserIsModerator } from "../../assert/assertInteractionUserIsModerator.js";
import { notAllowed } from "../../commonMessages.js";

export const pollPub: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const pollId = (<any>additionalData).d.pId;
    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const aPoll = await em.findOneOrFail(
        Poll,
        { id: pollId },
        {
          populate: ["steps", "steps.choices"],
        },
      );

      aPoll.publicationDate = new Date();

      await em.persist(aPoll).flush();

      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.SECTION,
              components: [
                {
                  type: MessageComponentTypes.TEXT_DISPLAY,
                  content: `# Oyé Oyé${aPoll.role ? ` <@&${aPoll.role}>` : ""}!\n-# Le staff réclame votre attention pour un sondage!`,
                },
                {
                  type: MessageComponentTypes.TEXT_DISPLAY,
                  content: aPoll.title,
                },
              ],
              accessory: {
                type: MessageComponentTypes.THUMBNAIL,
                media: {
                  url: `https://raw.githubusercontent.com/GTSpray/P-titPote/main/assets/ptitpote-sam.png?salt=${pollId}`,
                },
              },
            },
            {
              type: MessageComponentTypes.SEPARATOR,
              divider: true,
              spacing: 1,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Je vote!",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollResp",
                      pId: pollId,
                    },
                  }),
                },
              ],
            },
          ],
        },
      });
    }

    return res.status(500).json({ error: "unknown" });
  },
};
