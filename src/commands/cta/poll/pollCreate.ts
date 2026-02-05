import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
} from "discord-api-types/v10";
import { ModalHandlerDelcaration } from "../../modals.js";
import {
  InteractionResponseFlags,
  MessageComponentTypes,
} from "discord-interactions";
import { DiscordGuild } from "../../../db/entities/DiscordGuild.entity.js";
import { Poll } from "../../../db/entities/Poll.entity.js";

interface D {
  components: Component[];
  custom_id: string;
}

interface Component {
  component: Component2;
  id: number;
  type: number;
}

interface Component2 {
  custom_id: string;
  id: number;
  type: number;
  value: string;
}

export const pollCreate: ModalHandlerDelcaration<D> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    const { data } = req.body;
    const q = data?.components.find(
      (e: any) => `${e.component?.custom_id}` === "question",
    );
    const c = data?.components.filter((e: any) =>
      `${e.component?.custom_id}`.startsWith("choice"),
    );
    const roleId = (<any>additionalData).d.role || undefined;

    if (dbServices && guildId) {
      let guild: DiscordGuild;
      const em = dbServices.orm.em.fork();
      guild =
        (await em.findOne(DiscordGuild, { guildId })) ||
        new DiscordGuild(guildId);
      const aPoll = new Poll(`${q?.component.value}`, roleId);
      guild.polls.add(aPoll);
      await em.persist(guild).flush();

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
                  content:
                    "# Oyé Oyé!\n-# Le staff réclame votre attention pour un sondage!",
                },
                {
                  type: MessageComponentTypes.TEXT_DISPLAY,
                  content: aPoll.question,
                },
              ],
              accessory: {
                type: MessageComponentTypes.THUMBNAIL,
                media: {
                  url: `https://raw.githubusercontent.com/GTSpray/P-titPote/poll/assets/ptitpote-sam.png?salt=${aPoll.id}`,
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
                      a: "pollresp",
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
