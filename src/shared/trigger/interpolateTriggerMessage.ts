export type TriggerMessageContext = {
  userId: string;
  username: string;
  serverName: string;
};

export const interpolateTriggerMessage = (
  template: string,
  context: TriggerMessageContext,
): string =>
  template
    .replaceAll('{user}', `<@${context.userId}>`)
    .replaceAll('{username}', context.username)
    .replaceAll('{server}', context.serverName);
