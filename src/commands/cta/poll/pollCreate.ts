import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
} from "discord-api-types/v10";
import { ModalHandlerDelcaration } from "../../modals.js";
import { InteractionResponseFlags } from "discord-interactions";
import { DiscordGuild } from "../../../db/entities/DiscordGuild.entity.js";
import { Poll } from "../../../db/entities/Poll.entity.js";
import { PollStep } from "../../../db/entities/PollStep.entity.js";
import { PollChoice } from "../../../db/entities/PollChoice.entity.js";

interface CTAData {
  components: Component<CTAComponnent>[];
  custom_id: string;
}

type CTAComponnent = ComponentSimple | ComponentSelect;

interface Component<T extends CTAComponnent> {
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

type getInputComponnentByIdDeclaration<T extends CTAComponnent> =
  | Component<T>
  | undefined;
function getInputComponnentById<T extends CTAComponnent>(
  data: CTAData | undefined,
  componentId: string,
): getInputComponnentByIdDeclaration<T> {
  const cmp: unknown = data?.components.find(
    (e: any) => `${e.component?.custom_id}` === componentId,
  );

  if (cmp) {
    return <getInputComponnentByIdDeclaration<T>>cmp;
  }
  return undefined;
}

type getInputComponnentsByPrefixDeclaration<T extends CTAComponnent> =
  Component<T>[];
function getInputComponnentsByPrefix<T extends CTAComponnent>(
  data: CTAData | undefined,
  componentId: string,
): getInputComponnentsByPrefixDeclaration<T> {
  return data?.components.filter((e: any) =>
    `${e.component?.custom_id}`.startsWith(componentId),
  ) as getInputComponnentsByPrefixDeclaration<T>;
}

const getSummary = (aPoll: Poll) => {
  const summaryLines = [
    `## ${aPoll.title}`,
    "",
    ...aPoll.steps.reduce(
      (acc: string[], aStep) => [
        ...acc,
        `**${aStep.order + 1}. ${aStep.question}**`,
        ...aStep.choices.map((aChoice) => `- ${aChoice.label}`),
      ],
      [],
    ),
  ];
  return summaryLines.join("\n");
};

export const pollCreate: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    const { data } = req.body;
    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const pollId = (<any>additionalData).d.pId;
      let aPoll: Poll;
      if (!pollId) {
        const title = getInputComponnentById<ComponentSimple>(data, "title");
        const role = getInputComponnentById<ComponentSelect>(data, "role");
        const question = getInputComponnentById<ComponentSimple>(
          data,
          "question",
        );
        let aGuild: DiscordGuild;
        aGuild =
          (await em.findOne(DiscordGuild, { guildId })) ||
          new DiscordGuild(guildId);
        aPoll = new Poll(
          `${title?.component.value}`,
          role?.component.values[0],
        );
        aGuild.polls.add(aPoll);
        const firstStep = new PollStep(`${question?.component.value}`, 0);
        aPoll.steps.add(firstStep);
        await em.persist(aGuild).flush();
      } else {
        aPoll = await em.findOneOrFail(
          Poll,
          { id: pollId },
          {
            populate: ["steps", "steps.choices"],
          },
        );

        const newQuestion = getInputComponnentById<ComponentSimple>(
          data,
          "question",
        );
        if (newQuestion) {
          const newStep = new PollStep(
            `${newQuestion?.component.value}`,
            aPoll.steps.count(),
          );
          aPoll.steps.add(newStep);
        }

        const newChoices = getInputComponnentsByPrefix<ComponentSimple>(
          data,
          "choice",
        );
        if (newChoices.length > 0) {
          const lastStep = aPoll.steps.reduce(
            (_obj, current) => current,
            aPoll.steps[0],
          );
          const l = lastStep.choices.count();
          newChoices
            .map((e) => `${e.component.value}`.trim())
            .filter((e) => e !== "")
            .forEach((e, i) => {
              const newChoice = new PollChoice(e, l + i);
              lastStep.choices.add(newChoice);
            });
        }

        await em.persist(aPoll).flush();
      }

      const lastStep = aPoll.steps.reduce(
        (_obj, current) => current,
        aPoll.steps[0],
      );

      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: getSummary(aPoll),
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Ajouter des choix",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollAddC",
                      sId: lastStep.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Nouvelle question",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollAddQ",
                      pId: aPoll.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: "Publier le sondage",
                  custom_id: JSON.stringify({
                    t: "cta",
                    d: {
                      a: "pollPub",
                      pId: aPoll.id,
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
