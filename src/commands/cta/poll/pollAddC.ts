import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import { ModalHandlerDelcaration } from "../../modals.js";
import { PollStep } from "../../../db/entities/PollStep.entity.js";

interface D {
  components: Component<toto>[];
  custom_id: string;
}

type toto = ComponentSimple | ComponentSelect;

interface Component<T extends toto> {
  component: T;
  id: number;
  type: number;
}

interface ComponentSimple {
  custom_id: string;
  id: number;
  type: number;
  value: string | number;
}

interface ComponentSelect {
  custom_id: string;
  id: number;
  type: number;
  values: string[];
}
export const pollAddC: ModalHandlerDelcaration<D> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const questionId = (<any>additionalData).d.sId;
      const aPollStep = await em.findOneOrFail(
        PollStep,
        { id: questionId },
        {
          populate: ["poll", "choices"],
        },
      );
      const startIndex = aPollStep.choices.count();
      return res.json({
        type: InteractionResponseType.Modal,
        data: {
          custom_id: JSON.stringify({
            t: "cta",
            d: { a: "pollCreate", pId: aPollStep.poll.id },
          }),
          title: "Ajouter des choix",
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `# ${aPollStep.question}\n${aPollStep.choices.map((e) => e.label).join("\n")}`,
            },
            ...Array.from({ length: 4 }).map((_e, i) => {
              const choiceOrder = startIndex + i + 1;
              return {
                type: ComponentType.Label,
                label: `Choix n°${choiceOrder}`,
                component: {
                  type: ComponentType.TextInput,
                  custom_id: `choice${choiceOrder}`,
                  style: TextInputStyle.Short,
                  min_length: 1,
                  max_length: 100,
                  required: choiceOrder <= 2,
                },
              };
            }),
          ],
        },
      });
    }

    return res.status(500).json({ error: "unknown" });
  },
};
