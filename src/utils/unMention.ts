export const unMention = (str: string | null | undefined) =>
  `${str}`.replaceAll('@', '@\u200B');
