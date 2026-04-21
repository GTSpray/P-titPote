import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";

export const errorPayload = (content: string) => ({
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: {
    flags: InteractionResponseFlags.EPHEMERAL,
    content,
  },
});

export const notFoundPayload = () =>
  errorPayload(`ahem... j'ai rien trouvé... 🤷`);


export const notAllowed = () =>
  errorPayload(`ahem... je ne suis pas habilitée à le faire 🤷`);

export const foundItComponnents = () => [
  {
    type: MessageComponentTypes.TEXT_DISPLAY,
    content: "Voilà.. ce que j'ai trouvé",
  },
  {
    type: MessageComponentTypes.SEPARATOR,
    divider: true,
    spacing: 1,
  },
];

export const okComponnents = () => [
  {
    type: MessageComponentTypes.TEXT_DISPLAY,
    content: "Ok! C'est noté ;)",
  },
];
