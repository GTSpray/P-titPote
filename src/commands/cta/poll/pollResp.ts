import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import { CTAData, ModalHandlerDelcaration } from "../../modals.js";
import { Poll } from "../../../db/entities/Poll.entity.js";
import { PollStep } from "../../../db/entities/PollStep.entity.js";
import { errorPayload, notAllowed } from "../../commonMessages.js";
import { escapeModalTitle } from "../../../utils/escapeModalTitle.js"

export const pollResp: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    const pollId = (<any>additionalData).d.pId;
    const previousCursor = (<any>additionalData).d.prevStep || 0;

    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const aPoll = await em.findOne(Poll, {
        server: { guildId },
        id: pollId,
      });

      if (!aPoll) {
        return res.status(500).json({ error: "no Poll" });
      }

      const today = new Date();
      if (aPoll.endDate && aPoll.endDate.getTime() < today.getTime()) {
        return res.json(
          errorPayload("ahem... le bureau de vote est fermé... désolé"),
        );
      }

      if (aPoll.role && !req.body.member?.roles.includes(aPoll.role)) {
        return res.json(notAllowed());
      }

      const currentCursor = await em.findByCursor(PollStep, {
        where: {
          poll: aPoll,
        },
        first: 5,
        after: previousCursor, // can be either string or `Cursor` instance
        orderBy: { order: "asc" },
        populate: ["choices"],
      });

      return res.json({
        type: InteractionResponseType.Modal,
        data: {
          custom_id: JSON.stringify({
            t: "cta",
            d: {
              a: "pollVote",
              pId: aPoll.id,
            },
          }),
          title: escapeModalTitle(aPoll.title),
          components: currentCursor.items.map((step) => {
            let sub;
            if (step.choices.count() > 0) {
              sub = {
                type: ComponentType.StringSelect,
                custom_id: step.id,
                placeholder: "Choisis...",
                options: step.choices
                  .toArray()
                  .sort((a, b) => a.order - b.order)
                  .map(({ label, id }) => ({
                    label,
                    value: id,
                    emoji: {
                      name: "▪️",
                    },
                  })),
              };
            } else {
              sub = {
                type: ComponentType.TextInput,
                custom_id: step.id,
                style: TextInputStyle.Short,
                min_length: 1,
                max_length: 100,
                required: true,
              };
            }
            return {
              type: ComponentType.Label,
              label: step.question,
              component: sub,
            };
          }),
        },
      });
    }
    return res.status(500).json({ error: "unknown" });
  },
};
