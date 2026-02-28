import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import { CTAData, ModalHandlerDelcaration } from "../../modals.js";
import { Poll } from "../../../db/entities/Poll.entity.js";

export const pollAddQ: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const pollId = (<any>additionalData).d.pId;
      const aPoll = await em.findOneOrFail(
        Poll,
        { id: pollId },
        {
          populate: ["steps"],
        },
      );

      return res.json({
        type: InteractionResponseType.Modal,
        data: {
          custom_id: JSON.stringify({
            t: "cta",
            d: { a: "pollCreate", pId: aPoll.id },
          }),
          title: "Ajouter une question",
          components: [
            {
              type: ComponentType.Label,
              label: `Question du sondage`,
              component: {
                type: ComponentType.TextInput,
                custom_id: `question`,
                style: TextInputStyle.Paragraph,
                min_length: 1,
                max_length: 400,
                required: true,
              },
            },
          ],
        },
      });
    }

    return res.status(500).json({ error: "unknown" });
  },
};
