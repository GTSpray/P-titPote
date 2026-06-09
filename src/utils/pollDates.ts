export const isPollClosed = (
  endDate: Date | null | undefined,
  now = new Date(),
): boolean => !!endDate && endDate.getTime() <= now.getTime();

export const formatDiscordTimestamp = (
  date: Date,
  style: 'f' | 'R' = 'f',
): string => `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
