export const isPollClosed = (
  endDate: Date | null | undefined,
  now = new Date(),
): boolean => !!endDate && endDate.getTime() <= now.getTime();
