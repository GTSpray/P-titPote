import type { APIBaseInteraction, APIChannel } from 'discord-api-types/v10';
import { InteractionType } from 'discord-api-types/v10';
type DiscordInteractionBody<
  T extends InteractionType,
  Data,
> = APIBaseInteraction<T, Data>;

export function interactionBodyChannel<D extends object>(req: {
  body: DiscordInteractionBody<InteractionType.ApplicationCommand, D>;
}): Partial<APIChannel> & Pick<APIChannel, 'id' | 'type'> {
  const { channel } = req.body;
  if (!channel) {
    throw new Error('interaction mock body is missing channel');
  }
  return channel;
}
