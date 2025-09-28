import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";

const errorPayload = (content: string) => ({
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: {
    flags: InteractionResponseFlags.EPHEMERAL,
    content,
  },
});

export const notFoundPayload = () =>
  errorPayload(`ahem... j'ai rien trouvé... 🤷`);

export const foundItComponnents = () => [
  {
    type: MessageComponentTypes.TEXT_DISPLAY,
    content: "Voilà.. ce que j'ai trouvé",
  },
  {
    type: MessageComponentTypes.SEPARATOR, // ComponentType.SEPARATOR
    divider: true,
    spacing: 1,
  },
];
