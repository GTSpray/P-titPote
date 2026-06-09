const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/;

const toValidDate = (date: Date): Date | null =>
  Number.isNaN(date.getTime()) ? null : date;

const toUtcDate = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
): Date | null => {
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hours ||
    date.getUTCMinutes() !== minutes
  ) {
    return null;
  }

  return date;
};

export const parsePollEndDate = (value: string | undefined): Date | null => {
  const endDate = value?.trim();
  if (!endDate) {
    return null;
  }

  const dateTimeParts = DATE_TIME_PATTERN.exec(endDate);
  if (dateTimeParts) {
    const [, year, month, day, hours, minutes] = dateTimeParts;
    return toUtcDate(
      Number(year),
      Number(month),
      Number(day),
      Number(hours),
      Number(minutes),
    );
  }

  const dateOnlyParts = DATE_ONLY_PATTERN.exec(endDate);
  if (dateOnlyParts) {
    const [, year, month, day] = dateOnlyParts;
    return toUtcDate(Number(year), Number(month), Number(day), 23, 59);
  }

  return toValidDate(new Date(endDate));
};

export const isPollClosed = (
  endDate: Date | null | undefined,
  now = new Date(),
): boolean => !!endDate && endDate.getTime() <= now.getTime();

export const formatDiscordTimestamp = (
  date: Date,
  style: 'f' | 'R' = 'f',
): string => `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
