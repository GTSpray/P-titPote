export const formatDiscordTimestamp = (
  date: Date,
  style: 'f' | 'R' = 'f',
): string => `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
